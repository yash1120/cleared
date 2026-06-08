from cleared import connectors


def test_registry():
    assert set(connectors.CONNECTORS) == {"xero", "myob", "generic"}


def test_xero_company():
    c = connectors.get("xero").to_customer({"ContactID": "x1", "Name": "Acme Pty Ltd", "CompanyNumber": "123"})
    assert c.name == "Acme Pty Ltd"
    assert c.source == "xero"
    assert c.external_ref == "x1"
    assert c.entity_type.value == "company"


def test_xero_individual():
    c = connectors.get("xero").to_customer({"ContactID": "x2", "FirstName": "Jane", "LastName": "Doe"})
    assert c.entity_type.value == "individual"
    assert c.name == "Jane Doe"


def test_myob_mapping():
    c = connectors.get("myob").to_customer({"UID": "m1", "CompanyName": "Beta Co", "IsIndividual": False})
    assert c.source == "myob"
    assert c.external_ref == "m1"
    assert c.entity_type.value == "company"


def test_generic_mapping_and_defaults():
    c = connectors.get("generic").to_customer({"name": "Gamma", "entity_type": "trust", "external_ref": "g1", "source": "crm"})
    assert c.entity_type.value == "trust"
    assert c.external_ref == "g1"
    assert c.source == "crm"
    d = connectors.get("generic").to_customer({})
    assert d.name
    assert d.entity_type.value == "individual"
    assert d.role.value == "client"
