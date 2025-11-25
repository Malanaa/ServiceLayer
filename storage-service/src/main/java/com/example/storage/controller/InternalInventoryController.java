package com.example.storage.controller;

import com.example.storage.model.Inventory;
import com.example.storage.repository.InventoryRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.Optional;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;
import org.springframework.transaction.annotation.Transactional;

import com.example.storage.model.Reservation;
import com.example.storage.model.Sale;
import com.example.storage.repository.ReservationRepository;
import com.example.storage.repository.SaleRepository;

@RestController
@RequestMapping("/internal/inventory")
public class InternalInventoryController {

    private final InventoryRepository inventoryRepository;
    private final ReservationRepository reservationRepository;
    private final SaleRepository saleRepository;

    public InternalInventoryController(InventoryRepository inventoryRepository, ReservationRepository reservationRepository, SaleRepository saleRepository) {
        this.inventoryRepository = inventoryRepository;
        this.reservationRepository = reservationRepository;
        this.saleRepository = saleRepository;
    }

    @PostMapping("/insertItem")
    public ResponseEntity<Inventory> create(@RequestBody Inventory inv) {
        if (inv.getSku() == null) return ResponseEntity.badRequest().build();
        if (inventoryRepository.findBySku(inv.getSku()).isPresent()) return ResponseEntity.status(409).build();
        Inventory saved = inventoryRepository.save(inv);
        return ResponseEntity.created(URI.create("/internal/inventory/getItem/" + saved.getId())).body(saved);
    }
    @GetMapping("/getItem/{id}")
    public ResponseEntity<Inventory> get(@PathVariable Long id) {
        Optional<Inventory> o = inventoryRepository.findById(id);
        return o.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/getItems")
    public ResponseEntity<Page<Inventory>> list(Pageable pageable) {
        Page<Inventory> page = inventoryRepository.findAll(pageable);
        return ResponseEntity.ok(page);
    }

    @DeleteMapping("/deleteItem/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        if (!inventoryRepository.existsById(id)) return ResponseEntity.notFound().build();
        inventoryRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/updateItem/{id}")
    public ResponseEntity<Inventory> update(@PathVariable Long id, @RequestBody Inventory inv) {
        Optional<Inventory> o = inventoryRepository.findById(id);
        if (o.isEmpty()) return ResponseEntity.notFound().build();
        Inventory existing = o.get();
        existing.setSku(inv.getSku());
        existing.setName(inv.getName());
        existing.setDescription(inv.getDescription());
        existing.setQuantity(inv.getQuantity());
        existing.setPrice(inv.getPrice());
        Inventory saved = inventoryRepository.save(existing);
        return ResponseEntity.ok(saved);
    }

    @PostMapping("/reserve")
    @Transactional
    public ResponseEntity<?> reserve(@RequestBody Map<String,Object> body) {
        String sku = (String) body.get("sku");
        Integer qty = (Integer) body.get("quantity");
        String reservationId = (String) body.getOrDefault("reservationId", UUID.randomUUID().toString());
        String expiresAtStr = (String) body.get("expiresAt");
        OffsetDateTime expiresAt = expiresAtStr != null ? OffsetDateTime.parse(expiresAtStr) : OffsetDateTime.now().plusDays(1);

        Optional<Inventory> oi = inventoryRepository.findBySku(sku);
        if (oi.isEmpty()) return ResponseEntity.status(404).body(Map.of("error","sku_not_found"));
        Inventory inv = oi.get();
        if (inv.getQuantity() == null || inv.getQuantity() < qty) return ResponseEntity.status(409).body(Map.of("error","insufficient_stock"));

        // decrement
        inv.setQuantity(inv.getQuantity() - qty);
        inventoryRepository.save(inv);

        Reservation r = new Reservation();
        r.setId(reservationId);
        r.setSku(sku);
        r.setQuantity(qty);
        r.setStatus("RESERVED");
        r.setExpiresAt(expiresAt);
        reservationRepository.save(r);

        return ResponseEntity.ok(Map.of("reservationId", reservationId));
    }

    @PostMapping("/release")
    @Transactional
    public ResponseEntity<?> release(@RequestBody Map<String,Object> body) {
        String reservationId = (String) body.get("reservationId");
        Optional<Reservation> or = reservationRepository.findById(reservationId);
        if (or.isEmpty()) return ResponseEntity.status(404).body(Map.of("error","reservation_not_found"));
        Reservation r = or.get();
        if (!"RESERVED".equals(r.getStatus())) return ResponseEntity.ok(Map.of("released",true));

        Optional<Inventory> oi = inventoryRepository.findBySku(r.getSku());
        if (oi.isPresent()) {
            Inventory inv = oi.get();
            inv.setQuantity((inv.getQuantity() == null ? 0 : inv.getQuantity()) + r.getQuantity());
            inventoryRepository.save(inv);
        }

        r.setStatus("RELEASED");
        reservationRepository.save(r);
        return ResponseEntity.ok(Map.of("released",true));
    }

    @PostMapping("/finalize")
    @Transactional
    public ResponseEntity<?> finalizeReservation(@RequestBody Map<String,Object> body) {
        String reservationId = (String) body.get("reservationId");
        String orderId = (String) body.get("orderId");
        Optional<Reservation> or = reservationRepository.findById(reservationId);
        if (or.isEmpty()) return ResponseEntity.status(404).body(Map.of("error","reservation_not_found"));
        Reservation r = or.get();
        if (!"RESERVED".equals(r.getStatus())) return ResponseEntity.status(409).body(Map.of("error","invalid_status"));

        r.setStatus("FINALIZED");
        r.setOrderId(orderId);
        reservationRepository.save(r);

        // create sale record
        Sale s = new Sale();
        s.setCustomer((String) body.getOrDefault("customer","guest"));
        s.setProduct(r.getSku());
        s.setPrice((Double) body.getOrDefault("price", 0.0));
        s.setQuantity(r.getQuantity());
        saleRepository.save(s);

        return ResponseEntity.ok(Map.of("finalized",true));
    }
}
