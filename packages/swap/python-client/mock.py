from quoting_client import QuotingClient
import sys, getopt, asyncio
from typing import Optional


def print_and_flush(*args):
    print(*args)
    sys.stdout.flush()


class MockQuoter(QuotingClient):
    def on_connect(self):
        print_and_flush("connected")

    async def on_quote_request(self, quote):
        if quote.leg2 is not None:
            return [
                [
                    (-1, str(int(1e18))),
                ],
                [
                    (-1, str(int(1e18))),
                ],
            ]

        return [
            [
                (-1, str(int(1e18))),
            ]
        ]


async def main(argv):
    try:
        account_id: Optional[str] = None
        private_key: Optional[str] = None
        url = "http://localhost:8080"

        opts, args = getopt.getopt(
            argv, "", ["account-id=", "private-key=", "url="]
        )
        for opt, arg in opts:
            if opt == "--account-id":
                account_id = arg
            elif opt == "--private-key":
                private_key = arg
            elif opt == "--url":
                url = arg

        if account_id is None:
            raise Exception("account-id is required")

        if private_key is None:
            raise Exception("private-key is required")

        private_key_bytes = bytes(private_key, "utf-8")

        quoter = MockQuoter(account_id, private_key_bytes, url)

        await quoter.connect(wait_timeout=10)
    except Exception as e:
        print_and_flush(e)
        raise


if __name__ == "__main__":
    asyncio.run(main(sys.argv[1:]))
