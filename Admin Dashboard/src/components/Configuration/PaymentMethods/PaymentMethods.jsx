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
  syncPaymentMethodsToServer,
  defaultPaymentMethodsConfig,
  VENEZUELAN_BANKS,
  loadPaymentMethodsConfig,
  STORE_CONFIG_CLOUDINARY_URL,
} from "../../../utils/paymentMethods";

function PaymentMethods(props) {
  const { t } = props;
  const [methods, methodsSetter] = useState(
    defaultPaymentMethodsConfig.paymentMethods
  );
  const [saved, savedSetter] = useState(false);
  const [cloudinaryOk, cloudinaryOkSetter] = useState(false);
  const [remoteOk, remoteOkSetter] = useState(false);
  const [error, errorSetter] = useState("");
  const [loading, loadingSetter] = useState(true);

  useEffect(function () {
    loadPaymentMethodsConfig()
      .then(function (list) {
        if (list && list.length) {
          methodsSetter(list);
        }
      })
      .finally(function () {
        loadingSetter(false);
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
    cloudinaryOkSetter(result.cloudinary);
    remoteOkSetter(result.remote);
    if (!result.ok) {
      errorSetter(
        result.cloudinaryError ||
          result.remoteError ||
          t("Payment Methods save failed")
      );
    } else if (!result.cloudinary) {
      errorSetter(result.cloudinaryError || t("Payment Methods local only"));
    }
    setTimeout(function () {
      savedSetter(false);
    }, 5000);
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
            <small className="text-muted d-block">
              Cliente: {STORE_CONFIG_CLOUDINARY_URL}
            </small>
          </CardHeader>
          <Form onSubmit={handleSave}>
            <div className="pl-lg-4 pb-4">
              {loading && (
                <Alert color="info" className="mb-3">
                  {t("Loading")}…
                </Alert>
              )}
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

              {saved && cloudinaryOk && (
                <Alert color="success" className="mt-3 mb-0">
                  {t("Success")}! {t("Payment Methods saved")} —{" "}
                  {t("Synced to client Cloudinary")}
                  {remoteOk && " + " + t("Synced to client API")}
                </Alert>
              )}
              {saved && !cloudinaryOk && (
                <Alert color="warning" className="mt-3 mb-0">
                  {t("Payment Methods local only")}. {error}
                </Alert>
              )}
              {!saved && error && (
                <Alert color="warning" className="mt-3 mb-0">
                  {error}
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
