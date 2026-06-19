import React, { useState, useEffect } from "react";
import { withTranslation } from "react-i18next";
import {
  Row,
  Col,
  Card,
  CardHeader,
  FormGroup,
  Form,
  Button,
  Input,
  Alert,
} from "reactstrap";
import {
  getPaymentMethodsConfig,
  syncPaymentMethodsToServer,
  defaultPaymentMethodsConfig,
  VENEZUELAN_BANKS,
  fetchStoreConfigRemote,
} from "../../../utils/paymentMethods";

function PaymentMethods(props) {
  const { t } = props;
  const [methods, methodsSetter] = useState(
    getPaymentMethodsConfig().paymentMethods
  );
  const [saved, savedSetter] = useState(false);
  const [remoteOk, remoteOkSetter] = useState(false);
  const [error, errorSetter] = useState("");

  useEffect(function () {
    fetchStoreConfigRemote()
      .then(function (data) {
        if (data && data.paymentMethods) {
          methodsSetter(data.paymentMethods);
        }
      })
      .catch(function () {
        /* usa local */
      });
  }, []);

  const updateMethod = (index, field, value) => {
    const next = methods.slice();
    next[index] = Object.assign({}, next[index], { [field]: value });
    if (field === "bankCode") {
      const bank = VENEZUELAN_BANKS.find(function (b) {
        return b.code === value;
      });
      if (bank) next[index].bankName = bank.name;
    }
    methodsSetter(next);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    errorSetter("");
    const config = { paymentMethods: methods };
    const result = await syncPaymentMethodsToServer(config);
    savedSetter(true);
    remoteOkSetter(result.remote);
    if (!result.remote && result.error) {
      errorSetter(result.error);
    }
    setTimeout(function () {
      savedSetter(false);
    }, 4000);
  };

  const resetDefaults = () => {
    methodsSetter(defaultPaymentMethodsConfig.paymentMethods.slice());
  };

  return (
    <Row className="mt-3">
      <div className="col">
        <Card className="shadow">
          <CardHeader className="border-0">
            <h3 className="mb-0">{t("Payment Methods")}</h3>
            <small className="text-muted d-block">
              {t("Payment Methods help")}
            </small>
          </CardHeader>
          <Form onSubmit={handleSave}>
            <div className="pl-lg-4 pb-4">
              {methods.map(function (method, index) {
                return (
                  <Card key={method.id} className="mb-3 p-3 bg-secondary">
                    <FormGroup check className="mb-2">
                      <label className="form-check-label">
                        <Input
                          type="checkbox"
                          checked={!!method.enabled}
                          onChange={(e) =>
                            updateMethod(index, "enabled", e.target.checked)
                          }
                        />{" "}
                        <strong>{method.label}</strong>
                      </label>
                    </FormGroup>

                    {method.id === "pagomovil" && (
                      <Row>
                        <Col md="4">
                          <label>{t("Bank code")}</label>
                          <FormGroup>
                            <Input
                              type="select"
                              value={method.bankCode || "0102"}
                              onChange={(e) =>
                                updateMethod(index, "bankCode", e.target.value)
                              }
                            >
                              {VENEZUELAN_BANKS.map(function (b) {
                                return (
                                  <option key={b.code} value={b.code}>
                                    {b.code} — {b.name}
                                  </option>
                                );
                              })}
                            </Input>
                          </FormGroup>
                        </Col>
                        <Col md="4">
                          <label>{t("Phone")}</label>
                          <FormGroup>
                            <Input
                              value={method.phone || ""}
                              placeholder="04121234567"
                              onChange={(e) =>
                                updateMethod(index, "phone", e.target.value)
                              }
                            />
                          </FormGroup>
                        </Col>
                        <Col md="4">
                          <label>{t("ID number")}</label>
                          <FormGroup>
                            <Input
                              value={method.ci || ""}
                              placeholder="V12345678"
                              onChange={(e) =>
                                updateMethod(index, "ci", e.target.value)
                              }
                            />
                          </FormGroup>
                        </Col>
                      </Row>
                    )}

                    {method.id === "binance" && (
                      <Row>
                        <Col md="8">
                          <label>{t("Binance pay ID")}</label>
                          <FormGroup>
                            <Input
                              value={method.payId || ""}
                              placeholder="email@ejemplo.com o ID"
                              onChange={(e) =>
                                updateMethod(index, "payId", e.target.value)
                              }
                            />
                          </FormGroup>
                        </Col>
                      </Row>
                    )}
                  </Card>
                );
              })}

              <Row>
                <Col md="4">
                  <Button
                    color="secondary"
                    type="button"
                    block
                    onClick={resetDefaults}
                  >
                    {t("Reset defaults")}
                  </Button>
                </Col>
                <Col md="8">
                  <Button color="primary" block type="submit">
                    {t("Save")}
                  </Button>
                </Col>
              </Row>

              {saved && (
                <Alert color="success" className="mt-3 mb-0">
                  {t("Success")}! {t("Payment Methods saved")}
                  {remoteOk && " — " + t("Synced to client API")}
                </Alert>
              )}
              {error && (
                <Alert color="warning" className="mt-3 mb-0">
                  {error}. {t("Payment Methods local only")}
                </Alert>
              )}
            </div>
          </Form>
        </Card>
      </div>
    </Row>
  );
}

export default withTranslation()(PaymentMethods);
