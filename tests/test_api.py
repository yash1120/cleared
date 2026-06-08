from fastapi.testclient import TestClient

from cleared.api import app

client = TestClient(app)


def _register(email: str, prof: str = "real_estate") -> str:
    r = client.post("/api/auth/register", json={"email": email, "password": "secret123", "profession": prof})
    assert r.status_code == 200, r.text
    return r.json()["token"]


def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200 and r.json()["mode"] == "mock"


def test_protected_requires_auth():
    assert client.get("/api/records").status_code == 401
    assert client.post("/api/cdd", json={"name": "X", "entity_type": "individual", "role": "vendor"}).status_code == 401


def test_register_login_me():
    tok = _register("apitest1@x.com")
    me = client.get("/api/auth/me", headers={"Authorization": "Bearer " + tok})
    assert me.status_code == 200 and me.json()["email"] == "apitest1@x.com"
    assert client.post("/api/auth/login", json={"email": "apitest1@x.com", "password": "secret123"}).status_code == 200
    assert client.post("/api/auth/login", json={"email": "apitest1@x.com", "password": "nope"}).status_code == 401


def test_cdd_records_pdf():
    tok = _register("apitest2@x.com")
    h = {"Authorization": "Bearer " + tok}
    r = client.post("/api/cdd", json={"name": "Acme Pty Ltd", "entity_type": "company", "role": "purchaser"}, headers=h)
    assert r.status_code == 200, r.text
    rid = r.json()["record_id"]
    recs = client.get("/api/records", headers=h).json()
    assert any(x["id"] == rid for x in recs)
    pdf = client.get(f"/api/records/{rid}/pdf", headers=h)
    assert pdf.status_code == 200 and pdf.content[:4] == b"%PDF"


def test_integration_via_api_key():
    tok = _register("apitest3@x.com")
    h = {"Authorization": "Bearer " + tok}
    key = client.post("/api/keys", json={"name": "k"}, headers=h).json()["key"]
    r = client.post(
        "/api/integrations/xero/assess",
        headers={"X-API-Key": key},
        json={"ContactID": "e1", "Name": "Beta Pty Ltd"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["customer"]["source"] == "xero" and body["customer"]["external_ref"] == "e1"
    found = client.get("/api/records?external_ref=e1", headers={"X-API-Key": key}).json()
    assert len(found) == 1


def test_professions():
    r = client.get("/api/professions").json()
    assert {"real_estate", "accounting", "legal", "precious_metals", "tcsp"} <= set(r)
