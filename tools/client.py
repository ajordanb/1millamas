import httpx

from settings import settings


class PortfolioAPI:
    """Async client for the portfolio FastAPI backend."""

    def __init__(self, base_url: str | None = None, admin_token: str | None = None):
        self.base_url = (base_url or settings.base_url).rstrip("/")
        headers: dict[str, str] = {}
        token = admin_token if admin_token is not None else settings.admin_token
        if token:
            headers["Authorization"] = f"Bearer {token}"
        self._client = httpx.AsyncClient(base_url=self.base_url, headers=headers, timeout=30.0)

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        await self._client.aclose()

    async def aclose(self):
        await self._client.aclose()

    # --- Public ---
    async def submit_contact(self, name: str, email: str, message: str) -> dict:
        resp = await self._client.post("/contact", json={"name": name, "email": email, "message": message})
        resp.raise_for_status()
        return resp.json()

    async def verify_link(self, token: str) -> dict:
        resp = await self._client.post("/public/messages/verify-link", params={"token": token})
        resp.raise_for_status()
        return resp.json()

    # --- Admin ---
    async def list_messages(self, status: str | None = None, skip: int = 0, limit: int = 50) -> list[dict]:
        params: dict = {"skip": skip, "limit": limit}
        if status:
            params["status"] = status
        resp = await self._client.get("/messages", params=params)
        resp.raise_for_status()
        return resp.json()

    async def get_message(self, message_id: str) -> dict:
        resp = await self._client.get(f"/messages/{message_id}")
        resp.raise_for_status()
        return resp.json()

    async def update_status(self, message_id: str, status: str) -> dict:
        resp = await self._client.patch(f"/messages/{message_id}", json={"status": status})
        resp.raise_for_status()
        return resp.json()

    async def delete_message(self, message_id: str) -> dict:
        resp = await self._client.delete(f"/messages/{message_id}")
        resp.raise_for_status()
        return resp.json()

    async def reply(self, message_id: str, reply_text: str) -> dict:
        resp = await self._client.post(f"/messages/{message_id}/reply", json={"reply_text": reply_text})
        resp.raise_for_status()
        return resp.json()

    async def mark_unread(self, message_id: str) -> dict:
        resp = await self._client.post(f"/messages/{message_id}/mark-unread")
        resp.raise_for_status()
        return resp.json()

    async def get_unread_count(self) -> dict:
        resp = await self._client.get("/messages/unread-count")
        resp.raise_for_status()
        return resp.json()


if __name__ == "__main__":
    import asyncio

    async def main():
        async with PortfolioAPI() as api:
            count = await api.get_unread_count()
            print(count)

    asyncio.run(main())
