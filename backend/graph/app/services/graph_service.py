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

        # 1. MERGE Document node
        await run_query(
            """
            MERGE (d:Document {doc_id: $doc_id})
            SET d.file_name  = $file_name,
                d.file_type  = $file_type,
                d.title      = $title,
                d.content    = $content,
                d.metadata   = $metadata
            """,
            {
                "doc_id":    doc.doc_id,
                "file_name": doc.file_name,
                "file_type": doc.file_type,
                "title":     doc.title,
                "content":   doc.content[:2000],   # store excerpt only
                "metadata":  str(doc.metadata),
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

    async def get_document(self, doc_id: str) -> dict | None:
        result = await run_query(
            """
            MATCH (d:Document {doc_id: $doc_id})
            OPTIONAL MATCH (d)-[:MENTIONS]->(e:Entity)
            RETURN d, collect(e) AS entities
            """,
            {"doc_id": doc_id},
        )
        if not result:
            return None
        row = result[0]
        doc_props = dict(row["d"])
        doc_props["entities"] = [dict(e) for e in row["entities"]]
        return doc_props

    async def list_documents(self, skip: int = 0, limit: int = 20) -> list[dict]:
        result = await run_query(
            """
            MATCH (d:Document)
            RETURN d
            ORDER BY d.file_name
            SKIP $skip LIMIT $limit
            """,
            {"skip": skip, "limit": limit},
        )
        return [dict(r["d"]) for r in result]

    async def search_nodes(self, query: str, limit: int = 20) -> SearchResult:
        result = await run_query(
            """
            MATCH (e:Entity)
            WHERE toLower(e.text) CONTAINS toLower($query)
               OR toLower(e.label) CONTAINS toLower($query)
            RETURN e
            LIMIT $limit
            """,
            {"query": query, "limit": limit},
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

    async def get_neighbors(self, node_id: str, hops: int = 1) -> list[dict]:
        cypher = """
        MATCH path = (start {entity_id: $node_id})-[*1..$hops]-(neighbor)
        RETURN DISTINCT neighbor, labels(neighbor) AS labels
        LIMIT 50
        """
        result = await run_query(cypher, {"node_id": node_id, "hops": hops})
        return [
            {"node": dict(r["neighbor"]), "labels": r["labels"]}
            for r in result
        ]

    async def find_path(self, source_id: str, target_id: str) -> PathResult:
        result = await run_query(
            """
            MATCH (a {entity_id: $source_id}), (b {entity_id: $target_id})
            MATCH path = shortestPath((a)-[*]-(b))
            RETURN [n IN nodes(path) | {id: n.entity_id, text: n.text, label: n.label}] AS path,
                   length(path) AS length
            """,
            {"source_id": source_id, "target_id": target_id},
        )
        if not result:
            return PathResult(path=[], length=0)
        row = result[0]
        return PathResult(path=row["path"], length=row["length"])

    async def get_graph_stats(self) -> GraphStats:
        # Node counts per label
        label_result = await run_query(
            "MATCH (n) UNWIND labels(n) AS lbl RETURN lbl, count(*) AS cnt ORDER BY cnt DESC"
        )
        node_labels = {r["lbl"]: r["cnt"] for r in label_result}
        total_nodes = sum(node_labels.values())

        # Relationship counts per type
        rel_result = await run_query(
            "MATCH ()-[r]->() RETURN type(r) AS rel_type, count(*) AS cnt ORDER BY cnt DESC"
        )
        rel_types = {r["rel_type"]: r["cnt"] for r in rel_result}
        total_rels = sum(rel_types.values())

        return GraphStats(
            total_nodes=total_nodes,
            total_relationships=total_rels,
            node_labels=node_labels,
            relationship_types=rel_types,
        )

    async def delete_document(self, doc_id: str) -> dict:
        # Delete document and detach all relationships
        result = await run_query(
            """
            MATCH (d:Document {doc_id: $doc_id})
            OPTIONAL MATCH (d)-[:MENTIONS]->(e:Entity)
            WHERE NOT (e)<-[:MENTIONS]-(:Document {doc_id: $doc_id})
                  AND NOT (e)<-[:MENTIONS]-(:Document)
            DETACH DELETE d
            RETURN count(d) AS deleted
            """,
            {"doc_id": doc_id},
        )
        return {"doc_id": doc_id, "deleted": result[0]["deleted"] if result else 0}

    async def get_visualization(self, limit: int = 150) -> dict:
        """Return all nodes + edges for Cytoscape visualization."""
        # Get all entity nodes
        nodes_result = await run_query(
            """
            MATCH (n)
            RETURN n, labels(n) AS lbls
            LIMIT $limit
            """,
            {"limit": limit},
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

        # Get all edges
        edges_result = await run_query(
            """
            MATCH (a)-[r]->(b)
            RETURN
              coalesce(a.entity_id, a.doc_id) AS src,
              coalesce(b.entity_id, b.doc_id) AS tgt,
              type(r) AS rel_type
            LIMIT $limit
            """,
            {"limit": limit * 2},
        )
        edges = [
            {"source": r["src"], "target": r["tgt"], "label": r["rel_type"]}
            for r in edges_result
            if r["src"] and r["tgt"]
        ]
        return {"nodes": nodes, "edges": edges}

    async def get_alerts(self) -> list[dict]:
        """Auto-generate alerts from graph data."""
        alerts = []

        # 1. Isolated entities (no relationships)
        isolated = await run_query(
            """
            MATCH (e:Entity)
            WHERE NOT (e)-[]-()
            RETURN e LIMIT 20
            """
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
            MATCH (e:LINE_SEGMENT)
            WHERE e.r IS NOT NULL AND toFloat(e.r) < 0.001
            RETURN e LIMIT 10
            """
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
            MATCH (s:SUBSTATION)
            WHERE NOT (s)-[:SUBSTATION]->(:VOLTAGE_LEVEL) AND NOT (:VOLTAGE_LEVEL)-[:SUBSTATION]->(s)
            RETURN s LIMIT 10
            """
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
            OPTIONAL MATCH (d)-[:MENTIONS]->(e:Entity)
            WITH d, count(e) AS entity_count
            WHERE entity_count < 2
            RETURN d, entity_count LIMIT 10
            """
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

    async def export_graph(self, fmt: str = "json") -> str:
        """Export all nodes and edges in the requested format."""
        nodes_result = await run_query(
            "MATCH (n) RETURN n, labels(n) AS lbls LIMIT 5000"
        )
        edges_result = await run_query(
            "MATCH (a)-[r]->(b) RETURN coalesce(a.entity_id, a.doc_id) AS src, coalesce(b.entity_id, b.doc_id) AS tgt, type(r) AS rel_type, properties(r) AS props LIMIT 10000"
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

    async def clear_all(self) -> dict:
        """Delete ALL nodes and relationships from Neo4j."""
        result = await run_query(
            "MATCH (n) DETACH DELETE n RETURN count(n) AS deleted"
        )
        deleted = result[0]["deleted"] if result else 0
        logger.info("clear_all: deleted %d nodes", deleted)
        return {"message": "Graph cleared", "nodes_deleted": deleted}

    async def get_subgraph(self, doc_id: str) -> dict:
        """Return nodes + edges for graph visualisation."""
        nodes_result = await run_query(
            """
            MATCH (d:Document {doc_id: $doc_id})-[:MENTIONS]->(e:Entity)
            RETURN d, collect(e) AS entities
            """,
            {"doc_id": doc_id},
        )
        if not nodes_result:
            return {"nodes": [], "edges": []}

        row = nodes_result[0]
        doc_node = dict(row["d"])
        entity_nodes = [dict(e) for e in row["entities"]]

        edges_result = await run_query(
            """
            MATCH (d:Document {doc_id: $doc_id})-[:MENTIONS]->(e:Entity)
            OPTIONAL MATCH (e)-[r:RELATED_TO]->(e2:Entity)<-[:MENTIONS]-(d)
            RETURN collect(DISTINCT {source: e.entity_id, target: e2.entity_id, type: r.relation_type}) AS rels
            """,
            {"doc_id": doc_id},
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
