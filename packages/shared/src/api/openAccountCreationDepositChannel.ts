import { ChainflipNetwork } from '@chainflip/utils/chainflip';
import { z } from 'zod';
import { assetAndChain, hexString } from '../parsers.js';
import { validateAddress } from '../validation/addressValidation.js';

export const getAccountCreationDepositChannelSchema = (network: ChainflipNetwork) =>
  z
    .object({
      signatureData: z.object({
        Ethereum: z
          .object({
            signature: hexString,
            signer: hexString,
            sigType: z.literal('Eip712'),
          })
          .transform(({ sigType, ...rest }) => ({
            sig_type: sigType,
            ...rest,
          })),
      }),
      transactionMetadata: z
        .object({
          nonce: z.number().gte(0),
          expiryBlock: z.number().positive(),
        })
        .transform(({ nonce, expiryBlock }) => ({
          nonce,
          expiry_block: expiryBlock,
        })),
      asset: assetAndChain,
      refundAddress: z.string(),
      boostFeeBps: z.number().optional().default(0),
    })
    .superRefine(({ asset, refundAddress }, ctx) => {
      if (!validateAddress(asset.chain, refundAddress, network)) {
        ctx.addIssue({
          message: `Address "${refundAddress}" is not a valid "${asset.chain}" address for "${network}"`,
          code: z.ZodIssueCode.custom,
        });
      }
    });
