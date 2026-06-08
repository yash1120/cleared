from cleared import auth, sample_data, store
from cleared.cdd_agent import assess_customer


def _record():
    return assess_customer(sample_data.company_with_offshore_owner())  # mock mode -> canned


def test_user_crud():
    u = store.create_user("a@x.com", auth.hash_password("p"), "accounting", "Acme")
    assert u["email"] == "a@x.com"
    assert store.get_user_by_email("A@X.com")["id"] == u["id"]
    assert store.get_user_by_id(u["id"])["profession"] == "accounting"


def test_record_isolation():
    u1 = store.create_user("u1@x.com", auth.hash_password("p"), "real_estate")
    u2 = store.create_user("u2@x.com", auth.hash_password("p"), "real_estate")
    rec = _record()
    store.save_record(rec, u1["id"])
    assert store.get_record(rec.record_id, u1["id"]) is not None
    assert store.get_record(rec.record_id, u2["id"]) is None  # isolation
    assert all(r["id"] != rec.record_id for r in store.list_records(u2["id"]))


def test_external_ref_filter():
    u = store.create_user("u3@x.com", auth.hash_password("p"), "real_estate")
    rec = _record()
    rec.customer.external_ref = "ext-1"
    rec.customer.source = "xero"
    store.save_record(rec, u["id"])
    found = store.list_records(u["id"], external_ref="ext-1")
    assert len(found) == 1 and found[0]["external_ref"] == "ext-1"


def test_api_keys():
    u = store.create_user("u4@x.com", auth.hash_password("p"), "real_estate")
    key, key_hash, prefix = auth.generate_api_key()
    store.create_api_key(u["id"], "k", key_hash, prefix)
    assert store.get_user_id_by_key_hash(key_hash) == u["id"]
    keys = store.list_api_keys(u["id"])
    assert len(keys) == 1
    store.delete_api_key(keys[0]["id"], u["id"])
    assert store.get_user_id_by_key_hash(key_hash) is None


def test_stats_shape():
    u = store.create_user("u5@x.com", auth.hash_password("p"), "real_estate")
    store.save_record(_record(), u["id"])
    s = store.stats(u["id"])
    assert s["records"] >= 1
    assert "by_rating" in s and "last_7_days" in s
