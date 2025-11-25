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
import com.example.storage.model.ReservationGroup;
import com.example.storage.service.ReservationService;
import com.example.storage.model.Sale;
import com.example.storage.repository.ReservationRepository;
import com.example.storage.repository.SaleRepository;

@RestController
@RequestMapping("/internal/inventory")
public class InternalInventoryController {

    private final InventoryRepository inventoryRepository;
    private final ReservationRepository reservationRepository;
    private final SaleRepository saleRepository;
    private final com.example.storage.repository.ReservationGroupRepository reservationGroupRepository;
    private final ReservationService reservationService;

    public InternalInventoryController(InventoryRepository inventoryRepository, ReservationRepository reservationRepository, SaleRepository saleRepository, com.example.storage.repository.ReservationGroupRepository reservationGroupRepository, ReservationService reservationService) {
        this.inventoryRepository = inventoryRepository;
        this.reservationRepository = reservationRepository;
        this.saleRepository = saleRepository;
        this.reservationGroupRepository = reservationGroupRepository;
        this.reservationService = reservationService;
    }

    // Insert a new inventory item
    @PostMapping("/insertItem")
    public ResponseEntity<Inventory> create(@RequestBody Inventory inv) {
        if (inv.getSku() == null) return ResponseEntity.badRequest().build();
        if (inventoryRepository.findBySku(inv.getSku()).isPresent()) return ResponseEntity.status(409).build();
        Inventory saved = inventoryRepository.save(inv);
        return ResponseEntity.created(URI.create("/internal/inventory/getItem/" + saved.getId())).body(saved);
    }
    // Retrieve an inventory item by id
    @GetMapping("/getItem/{id}")
    public ResponseEntity<Inventory> get(@PathVariable Long id) {
        Optional<Inventory> o = inventoryRepository.findById(id);
        return o.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    // List inventory items with pagination
    @GetMapping("/getItems")
    public ResponseEntity<Page<Inventory>> list(Pageable pageable) {
        Page<Inventory> page = inventoryRepository.findAll(pageable);
        return ResponseEntity.ok(page);
    }

    // Delete an inventory item by id
    @DeleteMapping("/deleteItem/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        if (!inventoryRepository.existsById(id)) return ResponseEntity.notFound().build();
        inventoryRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    // Update inventory item fields
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

    // Reserve a specific sku/quantity (single reservation)
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

    // Atomically reserve a batch of items as a reservation group (used at checkout)
    @PostMapping("/reserveBatch")
    @Transactional
    public ResponseEntity<?> reserveBatch(@RequestBody Map<String,Object> body) {
        // body: { checkoutId, userId, expiresInSeconds, items: [{sku, quantity}] }
        String checkoutId = (String) body.getOrDefault("checkoutId", UUID.randomUUID().toString());
        String userId = String.valueOf(body.getOrDefault("userId", "guest"));
        Integer expiresIn = (Integer) body.getOrDefault("expiresInSeconds", 600);

        java.util.List<Map<String,Object>> items = (java.util.List<Map<String,Object>>) body.get("items");
        if (items == null || items.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error","no_items"));

        // pre-check availability with locks
        for (Map<String,Object> it : items) {
            String sku = (String) it.get("sku");
            Integer qty = (Integer) it.get("quantity");
            Optional<Inventory> oi = inventoryRepository.findBySku(sku);
            if (oi.isEmpty()) return ResponseEntity.status(404).body(Map.of("error","sku_not_found","sku",sku));
            Inventory inv = oi.get();
            int reserved = inv.getReserved() == null ? 0 : inv.getReserved();
            int available = (inv.getQuantity() == null ? 0 : inv.getQuantity()) - reserved;
            if (available < qty) {
                return ResponseEntity.status(409).body(Map.of("error","insufficient_stock","sku",sku,"requested",qty,"available",available));
            }
        }

        // all available, create group and reservations
        String groupId = UUID.randomUUID().toString();
        ReservationGroup group = new ReservationGroup();
        group.setId(groupId);
        group.setCheckoutId(checkoutId);
        group.setUserId(userId);
        group.setStatus("RESERVED");
        group.setExpiresAt(OffsetDateTime.now().plusSeconds(expiresIn));
        reservationGroupRepository.save(group);

        java.util.List<Map<String,Object>> reservationsResp = new java.util.ArrayList<>();
        for (Map<String,Object> it : items) {
            String sku = (String) it.get("sku");
            Integer qty = (Integer) it.get("quantity");
            Optional<Inventory> oi = inventoryRepository.findBySku(sku);
            Inventory inv = oi.get();
            // increment reserved
            inv.setReserved((inv.getReserved() == null ? 0 : inv.getReserved()) + qty);
            inventoryRepository.save(inv);

            Reservation r = new Reservation();
            String rid = UUID.randomUUID().toString();
            r.setId(rid);
            r.setSku(sku);
            r.setInventoryId(inv.getId());
            r.setQuantity(qty);
            r.setStatus("RESERVED");
            r.setReservationGroupId(groupId);
            r.setExpiresAt(group.getExpiresAt());
            reservationRepository.save(r);

            reservationsResp.add(Map.of("reservationId", rid, "inventoryId", inv.getId(), "sku", sku, "quantity", qty));
        }

        return ResponseEntity.ok(Map.of("status","OK","reservationGroupId",groupId,"checkoutId",checkoutId,"expiresAt",group.getExpiresAt().toString(),"reservations",reservationsResp));
    }

    // Release all reservations in a reservation group and restore inventory
    @PostMapping("/releaseBatch")
    @Transactional
    public ResponseEntity<?> releaseBatch(@RequestBody Map<String,Object> body) {
        String reservationGroupId = (String) body.get("reservationGroupId");
        if (reservationGroupId == null) return ResponseEntity.badRequest().body(Map.of("error","missing_reservationGroupId"));
        reservationService.releaseReservationGroup(reservationGroupId);
        return ResponseEntity.ok(Map.of("status","RELEASED","reservationGroupId",reservationGroupId));
    }

    // Finalize a reservation group into sales (decrement inventory permanently)
    @PostMapping("/finalizeBatch")
    @Transactional
    public ResponseEntity<?> finalizeBatch(@RequestBody Map<String,Object> body) {
        String reservationGroupId = (String) body.get("reservationGroupId");
        String orderId = (String) body.getOrDefault("orderId", UUID.randomUUID().toString());
        if (reservationGroupId == null) return ResponseEntity.badRequest().body(Map.of("error","missing_reservationGroupId"));
        reservationService.finalizeReservationGroup(reservationGroupId, orderId);
        return ResponseEntity.ok(Map.of("status","FINALIZED","reservationGroupId",reservationGroupId,"orderId",orderId));
    }

    // Release a single reservation by id and restore inventory
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

    // Finalize a single reservation into a sale
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
