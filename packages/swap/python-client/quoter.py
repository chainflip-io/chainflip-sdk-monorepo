from typing import Any
from abc import ABC, abstractmethod
from cryptography.hazmat.primitives import serialization
from dataclasses import dataclass
import base64, socketio, time
from typing import Optional, Dict, Tuple, TypedDict, List, Literal

AssetAndChain = TypedDict("AssetAndChain", {"asset": str, "chain": str})

LimitOrder = Tuple[int, str]

QuoteResponse = TypedDict("QuoteResponse", {"request_id": str, "limit_orders": List[LimitOrder]})

class QuoteRequest:
    request_id: str
    amount: str
    base_asset: AssetAndChain
    quote_asset: AssetAndChain
    side: Literal["BUY", "SELL"]

    def __init__(self, json: Dict[str, Any]):
        self.request_id = json["request_id"]
        self.base_asset = json["base_asset"]
        self.quote_asset = json["quote_asset"]
        self.amount = json["amount"]
        self.side = json["side"]


class Quoter(ABC):
    connected = False
    sio: Optional[socketio.AsyncClient] = None

    @abstractmethod
    async def on_quote_request(self, quote: QuoteRequest) -> List[LimitOrder]:
        pass

    def on_connect(self):
        pass

    async def send_quote(self, response: QuoteResponse):
        if self.connected and self.sio is not None:
            await self.sio.emit("quote_response", response)

    async def connect(
        self,
        market_maker_id: str,
        private_key_bytes: bytes,
        url: str,
        password: Optional[str] = None,
        wait_timeout: int = 1,
    ):
        self.sio = socketio.AsyncClient()

        @self.sio.event
        async def connect():
            self.connected = True
            self.on_connect()

        @self.sio.event
        async def quote_request(data: Dict[str, Any]):
            quote = QuoteRequest(data)
            limit_orders = await self.on_quote_request(quote)
            await self.send_quote(
                {
                    "request_id": quote.request_id,
                    "limit_orders": limit_orders
                }
            )

        timestamp = round(time.time() * 1000)
        signature = serialization.load_pem_private_key(
            private_key_bytes, password=password
        ).sign(
            b"%b%b" % (bytes(market_maker_id, "utf-8"), bytes(str(timestamp), "utf-8"))
        )

        await self.sio.connect(
            url,
            auth={
                "client_version": "1",
                "timestamp": timestamp,
                "market_maker_id": market_maker_id,
                "signature": base64.b64encode(signature).decode("utf-8"),
            },
            wait_timeout=wait_timeout,
        )
        await self.sio.wait()

    async def disconnect(self):
        if self.connected and self.sio is not None:
            await self.sio.disconnect()
            self.connected = False
