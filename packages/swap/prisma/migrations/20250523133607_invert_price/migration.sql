UPDATE private."Quote"
SET
  "indexPriceAtCompletion" = 1 / "indexPriceAtCompletion",
  "indexPriceAtChannelOpening" = 1 / "indexPriceAtChannelOpening";
