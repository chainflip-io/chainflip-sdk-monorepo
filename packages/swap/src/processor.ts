import backfillBeneficiaries from './backfilling/backfillBeneficiaries';
import processBlocks from './processBlocks';
import logger from './utils/logger';

// start
const start = () => {
  processBlocks().catch((error) => {
    logger.error('error processing blocks', { error });
    process.exit(1);
  });

  backfillBeneficiaries()
    .catch((error) => {
      logger.error('error backfilling beneficiaries', { error });
    })
    .finally(() => {
      logger.info('beneficiary backfill exited');
    });
};

export default start;
