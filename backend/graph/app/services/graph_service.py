"""
GraphService — core business logic for Knowledge Graph operations.

Operations:
  - ingest_document: creates Document node + Entity nodes + MENTIONS/RELATED_TO edges
  - get_document: fetch document with its entities
  - search_nodes: full-text search by label or text
  - get_graph_stats: counts per label/type
  - get_neighbors: expand N hops from a node
  - find_path: shortest path between two nodes
  - delete_document: remove doc + orphaned entities
"""
import csv
import io
import json
import logging
from app.core.neo4j_client import run_query
from app.models.schemas import (
    ExtractedDocument,
    IngestResponse,
    NodeResponse,
    GraphStats,
    SearchResult,
    PathResult,
)

logger = logging.getLogger(__name__)


class GraphService:

    # ── Ingest ─────────────────────────────────────────────────────────────

    async def ingest_document(self, doc: ExtractedDocument) -> IngestResponse:
        nodes_created = 0
        rels_created  = 0

        # 1. MERGE Document node (tag with user_id for per-user isolation)
        await run_query(
            """
            MERGE (d:Document {doc_id: $doc_id})
            SET d.file_name  = $file_name,
                d.file_type  = $file_type,
                d.title      = $title,
                d.content    = $content,
                d.metadata   = $metadata,
                d.user_id    = $user_id
            """,
            {
                "doc_id":    doc.doc_id,
                "file_name": doc.file_name,
                "file_type": doc.file_type,
                "title":     doc.title,
                "content":   doc.content[:2000],
                "metadata":  str(doc.metadata),
                "user_id":   doc.user_id,
            },
        )
        nodes_created += 1

        # 2. MERGE Entity nodes + MENTIONS relationship
        for entity in doc.entities:
            # Sanitize label for use as Cypher node label (alphanumeric + underscore only)
            safe_label = ''.join(c if c.isalnum() else '_' for c in (entity.label or 'ENTITY')).strip('_') or 'ENTITY'
            cypher = f"""
            MERGE (e:Entity:{safe_label} {{entity_id: $entity_id}})
            SET e.label = $label,
                e.text  = $text,
                e.name  = $name,
                e.type  = $entity_type,
                e += $properties
            WITH e
            MATCH (d:Document {{doc_id: $doc_id}})
            MERGE (d)-[r:MENTIONS]->(e)
            RETURN e
            """
            result = await run_query(
                cypher,
                {
                    "entity_id":   entity.id,
                    "label":       entity.label or safe_label,
                    "text":        entity.text or entity.name or '',
                    "name":        entity.name or entity.text or '',
                    "entity_type": entity.type or entity.label or 'ENTITY',
                    "properties":  entity.properties,
                    "doc_id":      doc.doc_id,
                },
            )
            if result:
                nodes_created += 1
                rels_created  += 1

        # 3. Ingest keywords as Keyword nodes linked to document
        for kw in (doc.keywords or [])[:30]:   # max 30 keywords per doc
            kw_clean = kw.strip()
            if not kw_clean:
                continue
            kw_id = str(__import__('uuid').uuid5(__import__('uuid').NAMESPACE_DNS, kw_clean))
            try:
                result = await run_query(
                    """
                    MERGE (k:Entity:KEYWORD {entity_id: $entity_id})
                    SET k.label = 'KEYWORD', k.text = $text, k.name = $text
                    WITH k
                    MATCH (d:Document {doc_id: $doc_id})
                    MERGE (d)-[:HAS_KEYWORD]->(k)
                    RETURN k
                    """,
                    {"entity_id": kw_id, "text": kw_clean, "doc_id": doc.doc_id},
                )
                if result:
                    nodes_created += 1
                    rels_created  += 1
            except Exception as e:
                logger.warning("Failed to ingest keyword %s: %s", kw_clean, e)

        # 4. Create RELATED_TO edges between entities
        for rel in doc.relations:
            cypher = """
            MATCH (a:Entity {entity_id: $source_id})
            MATCH (b:Entity {entity_id: $target_id})
            MERGE (a)-[r:RELATED_TO {relation_type: $rel_type}]->(b)
            SET r += $properties
            RETURN r
            """
            result = await run_query(
                cypher,
                {
                    "source_id":  rel.source_id,
                    "target_id":  rel.target_id,
                    "rel_type":   rel.relation_type,
                    "properties": rel.properties,
                },
            )
            if result:
                rels_created += 1

        logger.info(
            "Ingested doc %s: +%d nodes, +%d rels",
            doc.doc_id, nodes_created, rels_created,
        )
        return IngestResponse(
            doc_id=doc.doc_id,
            nodes_created=nodes_created,
            relationships_created=rels_created,
        )

    # ── Query ──────────────────────────────────────────────────────────────

    async def get_document(self, doc_id: str, user_id: str | None = None) -> dict | None:
        result = await run_query(
            """
            MATCH (d:Document {doc_id: $doc_id})
            WHERE $user_id IS NULL OR d.user_id = $user_id
            OPTIONAL MATCH (d)-[:MENTIONS]->(e:Entity)
            RETURN d, collect(e) AS entities
            """,
            {"doc_id": doc_id, "user_id": user_id},
        )
        if not result:
            return None
        row = result[0]
        doc_props = dict(row["d"])
        doc_props["entities"] = [dict(e) for e in row["entities"]]
        return doc_props

    async def list_documents(self, skip: int = 0, limit: int = 20,
                             user_id: str | None = None) -> list[dict]:
        result = await run_query(
            """
            MATCH (d:Document)
            WHERE $user_id IS NULL OR d.user_id = $user_id
            RETURN d
            ORDER BY d.file_name
            SKIP $skip LIMIT $limit
            """,
            {"skip": skip, "limit": limit, "user_id": user_id},
        )
        return [dict(r["d"]) for r in result]

    async def search_nodes(self, query: str, limit: int = 20,
                           user_id: str | None = None) -> SearchResult:
        result = await run_query(
            """
            MATCH (d:Document)-[:MENTIONS|HAS_KEYWORD]->(e:Entity)
            WHERE ($user_id IS NULL OR d.user_id = $user_id)
              AND (toLower(e.text) CONTAINS toLower($query)
                OR toLower(e.label) CONTAINS toLower($query))
            RETURN DISTINCT e
            LIMIT $limit
            """,
            {"query": query, "limit": limit, "user_id": user_id},
        )
        nodes = [
            NodeResponse(
                id=r["e"].get("entity_id", ""),
                label=r["e"].get("label", ""),
                properties=dict(r["e"]),
            )
            for r in result
        ]
        return SearchResult(nodes=nodes, total=len(nodes))

    async def get_neighbors(self, node_id: str, hops: int = 1,
                            user_id: str | None = None) -> list[dict]:
        # Verify the start node is reachable from one of the user's documents.
        # If user_id is None we allow it (legacy/internal callers).
        cypher = """
        MATCH (start {entity_id: $node_id})
        WHERE $user_id IS NULL
           OR ('Document' IN labels(start) AND start.user_id = $user_id)
           OR EXISTS { MATCH (d:Document {user_id: $user_id})-[*1..3]-(start) }
        MATCH path = (start)-[*1..3]-(neighbor)
        WHERE $user_id IS NULL
           OR ('Document' IN labels(neighbor) AND neighbor.user_id = $user_id)
           OR EXISTS { MATCH (d:Document {user_id: $user_id})-[*1..3]-(neighbor) }
        RETURN DISTINCT neighbor, labels(neighbor) AS labels
        LIMIT 50
        """
        result = await run_query(cypher, {"node_id": node_id, "user_id": user_id})
        return [
            {"node": dict(r["neighbor"]), "labels": r["labels"]}
            for r in result
        ]

    async def find_path(self, source_id: str, target_id: str,
                        user_id: str | None = None) -> PathResult:
        result = await run_query(
            """
            MATCH (a {entity_id: $source_id}), (b {entity_id: $target_id})
            WHERE $user_id IS NULL OR (
              EXISTS { MATCH (d:Document {user_id: $user_id})-[*0..3]-(a) }
              AND
              EXISTS { MATCH (d2:Document {user_id: $user_id})-[*0..3]-(b) }
            )
            MATCH path = shortestPath((a)-[*]-(b))
            RETURN [n IN nodes(path) | {id: n.entity_id, text: n.text, label: n.label}] AS path,
                   length(path) AS length
            """,
            {"source_id": source_id, "target_id": target_id, "user_id": user_id},
        )
        if not result:
            return PathResult(path=[], length=0)
        row = result[0]
        return PathResult(path=row["path"], length=row["length"])

    async def get_graph_stats(self, user_id: str | None = None) -> GraphStats:
        if user_id:
            # Count only this user's documents and their connected entities
            label_result = await run_query(
                """
                MATCH (d:Document {user_id: $user_id})
                WITH collect(d) AS docs
                UNWIND docs AS n
                WITH n, 'Document' AS lbl
                RETURN lbl, count(*) AS cnt
                UNION ALL
                MATCH (d:Document {user_id: $user_id})-[]->(e:Entity)
                UNWIND labels(e) AS lbl
                RETURN lbl, count(DISTINCT e) AS cnt
                """,
                {"user_id": user_id},
            )
            rel_result = await run_query(
                """
                MATCH (d:Document {user_id: $user_id})-[r]->()
                RETURN type(r) AS rel_type, count(r) AS cnt ORDER BY cnt DESC
                """,
                {"user_id": user_id},
            )
        else:
            label_result = await run_query(
                "MATCH (n) UNWIND labels(n) AS lbl RETURN lbl, count(*) AS cnt ORDER BY cnt DESC"
            )
            rel_result = await run_query(
                "MATCH ()-[r]->() RETURN type(r) AS rel_type, count(*) AS cnt ORDER BY cnt DESC"
            )

        node_labels = {r["lbl"]: r["cnt"] for r in label_result}
        total_nodes = sum(node_labels.values())
        rel_types = {r["rel_type"]: r["cnt"] for r in rel_result}
        total_rels = sum(rel_types.values())

        return GraphStats(
            total_nodes=total_nodes,
            total_relationships=total_rels,
            node_labels=node_labels,
            relationship_types=rel_types,
        )

    async def delete_document(self, doc_id: str, user_id: str | None = None) -> dict:
        result = await run_query(
            """
            MATCH (d:Document {doc_id: $doc_id})
            WHERE $user_id IS NULL OR d.user_id = $user_id
            DETACH DELETE d
            RETURN count(d) AS deleted
            """,
            {"doc_id": doc_id, "user_id": user_id},
        )
        return {"doc_id": doc_id, "deleted": result[0]["deleted"] if result else 0}

    async def get_visualization(self, limit: int = 150,
                                user_id: str | None = None) -> dict:
        """Return nodes + edges for Cytoscape — scoped to user's documents."""
        nodes_result = await run_query(
            """
            MATCH (n)
            WHERE $user_id IS NULL
               OR ('Document' IN labels(n) AND n.user_id = $user_id)
               OR (NOT 'Document' IN labels(n) AND EXISTS {
                   MATCH (d:Document {user_id: $user_id})-[]->(n)
               })
            RETURN n, labels(n) AS lbls
            LIMIT $limit
            """,
            {"limit": limit, "user_id": user_id},
        )
        nodes = []
        for r in nodes_result:
            props = dict(r["n"])
            labels = r["lbls"]
            node_id = props.get("entity_id") or props.get("doc_id") or props.get("id", "")
            label   = props.get("text") or props.get("label") or props.get("file_name") or node_id
            ntype   = next((l for l in labels if l not in ("Entity", "Document")), labels[0] if labels else "Entity")
            nodes.append({
                "id":         node_id,
                "label":      label,
                "type":       ntype,
                "group":      "Document" if "Document" in labels else "Entity",
                "properties": {k: str(v) for k, v in props.items()},
            })

        edges_result = await run_query(
            """
            MATCH (a)-[r]->(b)
            WHERE $user_id IS NULL
               OR EXISTS { MATCH (d:Document {user_id: $user_id})-[]->(a) }
               OR ('Document' IN labels(a) AND a.user_id = $user_id)
            RETURN
              coalesce(a.entity_id, a.doc_id) AS src,
              coalesce(b.entity_id, b.doc_id) AS tgt,
              type(r) AS rel_type
            LIMIT $limit
            """,
            {"limit": limit * 2, "user_id": user_id},
        )
        edges = [
            {"source": r["src"], "target": r["tgt"], "label": r["rel_type"]}
            for r in edges_result
            if r["src"] and r["tgt"]
        ]
        return {"nodes": nodes, "edges": edges}

    async def get_alerts(self, user_id: str | None = None) -> list[dict]:
        """Auto-generate alerts from graph data, scoped to user's documents."""
        alerts = []

        # 1. Isolated entities connected to user's documents only
        isolated = await run_query(
            """
            MATCH (d:Document)-[:MENTIONS]->(e:Entity)
            WHERE ($user_id IS NULL OR d.user_id = $user_id)
              AND NOT (e)-[:RELATED_TO]-()
            RETURN DISTINCT e LIMIT 20
            """,
            {"user_id": user_id},
        )
        for r in isolated:
            props = dict(r["e"])
            alerts.append({
                "id":        f"iso-{props.get('entity_id', '')}",
                "system":    props.get("text", "Unknown"),
                "type":      "Isolated Node",
                "severity":  "Low",
                "message":   f"Entity '{props.get('text', '')}' ({props.get('label', '')}) has no relationships in the graph.",
                "timestamp": "auto-detected",
                "status":    "Open",
                "timeline":  [{"time": "now", "event": "Detected by graph analysis"}],
            })

        # 2. Lines with very low resistance (potential short circuits)
        line_issues = await run_query(
            """
            MATCH (d:Document)-[:MENTIONS]->(e:LINE_SEGMENT)
            WHERE ($user_id IS NULL OR d.user_id = $user_id)
              AND e.r IS NOT NULL AND toFloat(e.r) < 0.001
            RETURN DISTINCT e LIMIT 10
            """,
            {"user_id": user_id},
        )
        for r in line_issues:
            props = dict(r["e"])
            alerts.append({
                "id":        f"line-{props.get('entity_id', '')}",
                "system":    props.get("text", "Unknown Line"),
                "type":      "Low Resistance",
                "severity":  "Medium",
                "message":   f"Line '{props.get('text', '')}' has very low resistance (r={props.get('r', 'N/A')}). Possible short circuit risk.",
                "timestamp": "auto-detected",
                "status":    "Open",
                "timeline":  [{"time": "now", "event": "Detected by impedance analysis"}],
            })

        # 3. Substations with no voltage levels
        orphan_subs = await run_query(
            """
            MATCH (d:Document)-[:MENTIONS]->(s:SUBSTATION)
            WHERE ($user_id IS NULL OR d.user_id = $user_id)
              AND NOT (s)-[:SUBSTATION]->(:VOLTAGE_LEVEL)
              AND NOT (:VOLTAGE_LEVEL)-[:SUBSTATION]->(s)
            RETURN DISTINCT s LIMIT 10
            """,
            {"user_id": user_id},
        )
        for r in orphan_subs:
            props = dict(r["s"])
            alerts.append({
                "id":        f"sub-{props.get('entity_id', '')}",
                "system":    props.get("text", "Unknown Substation"),
                "type":      "Missing Voltage Level",
                "severity":  "Medium",
                "message":   f"Substation '{props.get('text', '')}' has no associated voltage levels.",
                "timestamp": "auto-detected",
                "status":    "Open",
                "timeline":  [{"time": "now", "event": "Detected by topology analysis"}],
            })

        # 4. Documents with very few entities (poor extraction)
        sparse_docs = await run_query(
            """
            MATCH (d:Document)
            WHERE $user_id IS NULL OR d.user_id = $user_id
            OPTIONAL MATCH (d)-[:MENTIONS]->(e:Entity)
            WITH d, count(e) AS entity_count
            WHERE entity_count < 2
            RETURN d, entity_count LIMIT 10
            """,
            {"user_id": user_id},
        )
        for r in sparse_docs:
            props = dict(r["d"])
            cnt = r["entity_count"]
            alerts.append({
                "id":        f"doc-{props.get('doc_id', '')}",
                "system":    props.get("file_name", "Unknown Document"),
                "type":      "Sparse Extraction",
                "severity":  "Low",
                "message":   f"Document '{props.get('file_name', '')}' only has {cnt} extracted entities. Consider re-processing.",
                "timestamp": "auto-detected",
                "status":    "Open",
                "timeline":  [{"time": "now", "event": "Detected by extraction quality check"}],
            })

        return alerts

    async def export_graph(self, fmt: str = "json",
                           user_id: str | None = None) -> str:
        """Export user's nodes and edges in the requested format."""
        nodes_result = await run_query(
            """
            MATCH (n)
            WHERE $user_id IS NULL
               OR ('Document' IN labels(n) AND n.user_id = $user_id)
               OR (NOT 'Document' IN labels(n) AND EXISTS {
                   MATCH (d:Document {user_id: $user_id})-[]->(n)
               })
            RETURN n, labels(n) AS lbls LIMIT 5000
            """,
            {"user_id": user_id},
        )
        edges_result = await run_query(
            """
            MATCH (d:Document)-[r]->(b)
            WHERE $user_id IS NULL OR d.user_id = $user_id
            RETURN coalesce(d.entity_id, d.doc_id) AS src,
                   coalesce(b.entity_id, b.doc_id) AS tgt,
                   type(r) AS rel_type, properties(r) AS props
            LIMIT 10000
            """,
            {"user_id": user_id},
        )

        nodes = [{"id": dict(r["n"]).get("entity_id") or dict(r["n"]).get("doc_id", ""), "labels": r["lbls"], **dict(r["n"])} for r in nodes_result]
        edges = [{"source": r["src"], "target": r["tgt"], "type": r["rel_type"], **r["props"]} for r in edges_result if r["src"] and r["tgt"]]

        if fmt == "csv":
            out = io.StringIO()
            w = csv.writer(out)
            w.writerow(["id", "type", "label", "text"])
            for n in nodes:
                w.writerow([n.get("id"), ",".join(n.get("labels", [])), n.get("label", ""), n.get("text", "")])
            out.write("\n# Edges\nsource,target,type\n")
            for e in edges:
                out.write(f"{e['source']},{e['target']},{e['type']}\n")
            return out.getvalue()

        return json.dumps({"nodes": nodes, "edges": edges}, default=str, indent=2)

    async def clear_all(self, user_id: str | None = None) -> dict:
        """Delete user's documents from Neo4j (or all if no user_id).
        Also cleans up orphaned documents (user_id IS NULL) left over from
        uploads made before user-isolation was in place."""
        if user_id:
            # Delete user-tagged documents
            r1 = await run_query(
                """
                MATCH (d:Document {user_id: $user_id})
                DETACH DELETE d
                RETURN count(d) AS deleted
                """,
                {"user_id": user_id},
            )
            # Delete orphaned documents (NULL user_id — pre-isolation legacy data)
            r2 = await run_query(
                """
                MATCH (d:Document) WHERE d.user_id IS NULL
                DETACH DELETE d
                RETURN count(d) AS deleted
                """
            )
            deleted = (r1[0]["deleted"] if r1 else 0) + (r2[0]["deleted"] if r2 else 0)
        else:
            result = await run_query(
                "MATCH (n) DETACH DELETE n RETURN count(n) AS deleted"
            )
            deleted = result[0]["deleted"] if result else 0
        logger.info("clear_all(user=%s): deleted %d nodes", user_id, deleted)
        return {"message": "Graph cleared", "nodes_deleted": deleted}

    async def get_subgraph(self, doc_id: str, user_id: str | None = None) -> dict:
        """Return nodes + edges for graph visualisation, scoped to the caller."""
        nodes_result = await run_query(
            """
            MATCH (d:Document {doc_id: $doc_id})
            WHERE $user_id IS NULL OR d.user_id = $user_id
            OPTIONAL MATCH (d)-[:MENTIONS]->(e:Entity)
            RETURN d, collect(e) AS entities
            """,
            {"doc_id": doc_id, "user_id": user_id},
        )
        if not nodes_result:
            return {"nodes": [], "edges": []}

        row = nodes_result[0]
        doc_node = dict(row["d"])
        entity_nodes = [dict(e) for e in row["entities"]]

        edges_result = await run_query(
            """
            MATCH (d:Document {doc_id: $doc_id})
            WHERE $user_id IS NULL OR d.user_id = $user_id
            MATCH (d)-[:MENTIONS]->(e:Entity)
            OPTIONAL MATCH (e)-[r:RELATED_TO]->(e2:Entity)<-[:MENTIONS]-(d)
            RETURN collect(DISTINCT {source: e.entity_id, target: e2.entity_id, type: r.relation_type}) AS rels
            """,
            {"doc_id": doc_id, "user_id": user_id},
        )
        edges = [
            e for e in (edges_result[0]["rels"] if edges_result else [])
            if e["source"] and e["target"]
        ]

        return {
            "nodes": [{"id": doc_node.get("doc_id"), "type": "Document", **doc_node}]
                    + [{"id": e.get("entity_id"), "type": "Entity", **e} for e in entity_nodes],
            "edges": edges,
        }
