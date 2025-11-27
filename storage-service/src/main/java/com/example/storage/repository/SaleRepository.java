package com.example.storage.repository;

import com.example.storage.model.Sale;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.OffsetDateTime;

@Repository
public interface SaleRepository extends JpaRepository<Sale, Long> {
	Page<Sale> findByCustomer(String customer, Pageable pageable);
	Page<Sale> findByProduct(String product, Pageable pageable);
	Page<Sale> findByPurchasedAtBetween(OffsetDateTime from, OffsetDateTime to, Pageable pageable);
}
