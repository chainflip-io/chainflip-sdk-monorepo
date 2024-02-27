BEGIN;
ALTER TYPE "public"."Asset" RENAME TO "InternalAsset";
COMMIT;