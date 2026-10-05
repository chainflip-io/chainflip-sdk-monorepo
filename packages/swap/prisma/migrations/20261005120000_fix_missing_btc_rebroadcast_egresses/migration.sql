-- A manual forced re-broadcast of stuck BTC egresses created new egress ids
-- (84774-84817) and broadcasts (83928, 83931-83936) on-chain. The new egresses
-- were never scheduled through the regular swap flow, so the processor skipped
-- `BatchBroadcastRequested` and never created the broadcasts. The affected swap
-- requests still point at their old egresses, whose broadcasts never succeeded,
-- leaving them stuck in `SENDING`.
--
-- Mirrors chainflip-web-services#2512.

CREATE TEMP TABLE "rebroadcasts" (
  "nativeId" BIGINT NOT NULL,
  "requestedAt" TIMESTAMP(3) NOT NULL,
  "requestedBlockIndex" TEXT NOT NULL,
  "succeededAt" TIMESTAMP(3) NOT NULL,
  "succeededBlockIndex" TEXT NOT NULL,
  "transactionRef" TEXT NOT NULL
);

INSERT INTO "rebroadcasts" VALUES
  (83928, '2025-12-19 20:32:00.000', '10974951-131',  '2025-12-19 20:36:06.000', '10974991-1195', 'a42c18bb2452f7fa195c51ec8e2b93803762152d41f1cbe9d7fe73c05dff4c2d'),
  (83931, '2025-12-19 20:32:18.000', '10974954-2103', '2025-12-19 20:36:06.000', '10974991-1201', '20a0f548161cde2625bda21634758ccac1e544f89f0f904afe271e8c585bb1f5'),
  (83932, '2025-12-19 20:32:24.001', '10974955-1330', '2025-12-19 20:36:06.000', '10974991-1192', 'ba11dd33b9759e5bc437fb0956799633592aa009da075505a0e782f9ac8dea1e'),
  (83933, '2025-12-19 20:32:36.000', '10974956-2025', '2025-12-19 20:36:06.000', '10974991-1204', '069e28a0726334d8d7ff1dd8fc0f060d179c11732c21986c8c06fd1f92d947fd'),
  (83934, '2025-12-19 20:32:42.000', '10974957-1427', '2025-12-19 20:36:06.000', '10974991-1198', 'a87361d77dc5396c86b481e6035e1db4ec9c7687923f8ad4e240332c561800d4'),
  (83935, '2025-12-20 11:21:36.001', '10983727-193',  '2025-12-20 11:31:48.000', '10983827-973',  '94a2afe91637e8f71f0fa82bbfde1d13e73770a4f55098e93a6f4c096ca29a63'),
  (83936, '2025-12-20 11:21:42.000', '10983728-1264', '2025-12-20 11:31:48.000', '10983827-976',  'e31185bc3d093760697bd8dfb586d6ecfab468ba27a3d2d6bed9eb804355f9e9');

CREATE TEMP TABLE "rebroadcast_egresses" (
  "swapRequestNativeId" BIGINT NOT NULL,
  "oldEgressNativeId" BIGINT NOT NULL,
  "newEgressNativeId" BIGINT NOT NULL,
  "broadcastNativeId" BIGINT NOT NULL
);

INSERT INTO "rebroadcast_egresses" VALUES
  (1125917, 84708, 84774, 83928),
  (1126665, 84760, 84775, 83928),
  (1125972, 84717, 84776, 83928),
  (1125955, 84712, 84777, 83928),
  (1125956, 84713, 84778, 83928),
  (1126338, 84741, 84789, 83931),
  (1126313, 84739, 84790, 83931),
  (1126255, 84735, 84791, 83931),
  (1126225, 84731, 84792, 83931),
  (1125945, 84709, 84793, 83931),
  (1126245, 84732, 84794, 83932),
  (1126419, 84742, 84795, 83932),
  (1126259, 84736, 84796, 83932),
  (1126299, 84737, 84797, 83932),
  (1126176, 84727, 84798, 83932),
  (1125977, 84719, 84799, 83933),
  (1126680, 84761, 84800, 83933),
  (1126214, 84730, 84801, 83933),
  (1126356, 84743, 84802, 83933),
  (1126460, 84755, 84803, 83933),
  (1126122, 84740, 84804, 83934),
  (1126037, 84729, 84805, 83934),
  (1126655, 84765, 84806, 83934),
  (1126986, 84773, 84807, 83934),
  (1126315, 84738, 84808, 83935),
  (1125912, 84706, 84809, 83935),
  (1125948, 84711, 84810, 83935),
  (1125876, 84704, 84811, 83935),
  (1126252, 84733, 84812, 83935),
  (1125970, 84716, 84813, 83936),
  (1125947, 84710, 84814, 83936),
  (1125915, 84707, 84815, 83936),
  (1125965, 84715, 84816, 83936),
  (1125975, 84718, 84817, 83936);

-- only fix swap requests that are still pointing at their old egress
DELETE FROM "rebroadcast_egresses" re
WHERE NOT EXISTS (
  SELECT 1
  FROM "SwapRequest" sr
  JOIN "Egress" e ON e."id" = sr."egressId"
  WHERE sr."nativeId" = re."swapRequestNativeId"
    AND e."chain" = 'Bitcoin'
    AND e."nativeId" = re."oldEgressNativeId"
);

INSERT INTO "Broadcast" ("nativeId", "chain", "requestedAt", "requestedBlockIndex", "succeededAt", "succeededBlockIndex", "transactionRef")
SELECT rb."nativeId", 'Bitcoin', rb."requestedAt", rb."requestedBlockIndex", rb."succeededAt", rb."succeededBlockIndex", rb."transactionRef"
FROM "rebroadcasts" rb
WHERE EXISTS (SELECT 1 FROM "rebroadcast_egresses" re WHERE re."broadcastNativeId" = rb."nativeId")
ON CONFLICT DO NOTHING;

-- the re-broadcast egresses carry the same amount as the ones they replace and
-- are considered scheduled when the batch broadcast was requested
INSERT INTO "Egress" ("nativeId", "chain", "amount", "scheduledAt", "scheduledBlockIndex", "broadcastId")
SELECT re."newEgressNativeId", 'Bitcoin', old."amount", rb."requestedAt", rb."requestedBlockIndex", b."id"
FROM "rebroadcast_egresses" re
JOIN "rebroadcasts" rb ON rb."nativeId" = re."broadcastNativeId"
JOIN "Broadcast" b ON b."chain" = 'Bitcoin' AND b."nativeId" = re."broadcastNativeId"
JOIN "Egress" old ON old."chain" = 'Bitcoin' AND old."nativeId" = re."oldEgressNativeId"
ON CONFLICT DO NOTHING;

UPDATE "SwapRequest" sr
SET "egressId" = new_e."id"
FROM "rebroadcast_egresses" re
JOIN "Egress" old_e ON old_e."chain" = 'Bitcoin' AND old_e."nativeId" = re."oldEgressNativeId"
JOIN "Egress" new_e ON new_e."chain" = 'Bitcoin' AND new_e."nativeId" = re."newEgressNativeId"
WHERE sr."nativeId" = re."swapRequestNativeId"
  AND sr."egressId" = old_e."id";

DROP TABLE "rebroadcast_egresses";
DROP TABLE "rebroadcasts";
