package ai.cognigrid.gateway.admin.repository;

import ai.cognigrid.gateway.admin.entity.ActivityEvent;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ActivityEventRepository extends JpaRepository<ActivityEvent, UUID> {

    @Query("SELECT a FROM ActivityEvent a ORDER BY a.createdAt DESC")
    List<ActivityEvent> findRecent(Pageable page);

    @Query("SELECT a FROM ActivityEvent a WHERE a.type = :type ORDER BY a.createdAt DESC")
    List<ActivityEvent> findByType(String type, Pageable page);

    @Query("SELECT a FROM ActivityEvent a WHERE a.actorEmail = :email OR a.targetEmail = :email ORDER BY a.createdAt DESC")
    List<ActivityEvent> findRelatedTo(String email, Pageable page);
}
