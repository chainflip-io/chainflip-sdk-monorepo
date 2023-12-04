import axios from 'axios';
import { z } from 'zod';

const schema = z.object({ identifications: z.array(z.object({})) });

export default async function screenAddress(address: string): Promise<boolean> {
  const apiKey = process.env.CHAINALYSIS_API_KEY;

  if (!apiKey) return false;

  const response = await axios.get(
    `https://public.chainalysis.com/api/v1/address/${address}`,
    { headers: { 'X-API-Key': apiKey } },
  );

  const result = schema.safeParse(response.data);

  if (!result.success) return false;

  return result.data.identifications.length > 0;
}
