import { EventHandlerArgs } from '..';
import { networkDepositReceived } from '../v120/networkDepositReceived';

export const depositFinalised = (args: EventHandlerArgs) => networkDepositReceived(args);
