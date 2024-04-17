from typing import Any
from abc import ABC, abstractmethod
from cryptography.hazmat.primitives import serialization
from dataclasses import dataclass
import base64, socketio, time
from typing import Optional, Dict, Tuple, TypedDict, List, Literal

AssetAndChain = TypedDict("AssetAndChain", {"asset": str, "chain": str})

LimitOrder = Tuple[int, str]

QuoteResponse = TypedDict(
    "QuoteResponse", {"request_id": str, "legs": List[List[LimitOrder]]}
)

Leg = TypedDict(
    "Leg",
    {
        "amount": str,
        "base_asset": AssetAndChain,
        "quote_asset": AssetAndChain,
        "side": Literal["BUY", "SELL"],
    },
)


@dataclass
class QuoteRequest:
    request_id: str
    leg1: Leg
    leg2: Optional[Leg] = None

    def __init__(self, json: Dict[str, Any]):
        self.request_id = json["request_id"]
        self.leg1 = json["legs"][0]
        if len(json["legs"]) > 1:
            self.leg2 = json["legs"][1]


class QuotingClient(ABC):
    connected = False
    sio: Optional[socketio.AsyncClient] = None

    @abstractmethod
    async def on_quote_request(self, quote: QuoteRequest) -> List[List[LimitOrder]]:
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
            legs = await self.on_quote_request(quote)
            await self.send_quote({"request_id": quote.request_id, "legs": legs})

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
