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
  Spinner,
} from "reactstrap";
import { bcv_api_url } from "../../../config/config";
import {
  getMultiCurrencyConfig,
  saveMultiCurrencyConfig,
  defaultMultiCurrencyConfig,
} from "../../../utils/multiCurrency";
import { refreshBcvExchangeRate } from "../../../utils/bcvRate";

function MultiCurrency(props) {
  const stored = getMultiCurrencyConfig();
  const [enabled, enabledSetter] = useState(stored.enabled);
  const [autoBcv, autoBcvSetter] = useState(stored.autoBcv !== false);
  const [primaryCode, primaryCodeSetter] = useState(
    stored.primaryCode || defaultMultiCurrencyConfig.primaryCode
  );
  const [primarySymbol, primarySymbolSetter] = useState(
    stored.primarySymbol || defaultMultiCurrencyConfig.primarySymbol
  );
  const [secondaryCode, secondaryCodeSetter] = useState(
    stored.secondaryCode || defaultMultiCurrencyConfig.secondaryCode
  );
  const [secondarySymbol, secondarySymbolSetter] = useState(
    stored.secondarySymbol || defaultMultiCurrencyConfig.secondarySymbol
  );
  const [exchangeRate, exchangeRateSetter] = useState(
    String(stored.exchangeRate || defaultMultiCurrencyConfig.exchangeRate)
  );
  const [rateDate, rateDateSetter] = useState(stored.rateDate || "");
  const [rateFetchedAt, rateFetchedAtSetter] = useState(
    stored.rateFetchedAt || ""
  );
  const [saved, savedSetter] = useState(false);
  const [loading, loadingSetter] = useState(false);
  const [fetchError, fetchErrorSetter] = useState("");

  const { t } = props;

  const fetchBcvRate = async () => {
    loadingSetter(true);
    fetchErrorSetter("");
    try {
      const bcv = await refreshBcvExchangeRate();
      exchangeRateSetter(String(bcv.rate));
      rateDateSetter(bcv.rateDate || "");
      rateFetchedAtSetter(bcv.fetchedAt);
    } catch (e) {
      fetchErrorSetter(e.message || t("BCV fetch error"));
    } finally {
      loadingSetter(false);
    }
  };

  useEffect(function () {
    if (autoBcv) {
      fetchBcvRate();
    }
  }, []);

  const handleSave = (e) => {
    e.preventDefault();
    const rate = parseFloat(exchangeRate);
    if (isNaN(rate) || rate <= 0) {
      return;
    }
    saveMultiCurrencyConfig({
      enabled: enabled,
      autoBcv: autoBcv,
      primaryCode: primaryCode,
      primarySymbol: primarySymbol,
      secondaryCode: secondaryCode,
      secondarySymbol: secondarySymbol,
      exchangeRate: rate,
      rateSource: autoBcv ? "bcv" : "manual",
      rateDate: rateDate,
      rateFetchedAt: rateFetchedAt,
    });
    savedSetter(true);
    setTimeout(function () {
      savedSetter(false);
    }, 2500);
  };

  const sample = (10 * parseFloat(exchangeRate || 0)).toFixed(2);
  const apiBase = (bcv_api_url || "http://localhost:8000").replace(/\/$/, "");

  return (
    <Row className="mt-3">
      <div className="col">
        <Card className="shadow">
          <CardHeader className="border-0">
            <h3 className="mb-0">{t("Multi-Currency")}</h3>
            <small className="text-muted d-block">
              {t("Multi-Currency help")}
            </small>
            <small className="text-muted">BCV API: {apiBase}/usd/simple</small>
          </CardHeader>
          <Form onSubmit={handleSave}>
            <div className="pl-lg-4 pb-4">
              <Row>
                <Col md="12">
                  <FormGroup check className="mb-2">
                    <label className="form-check-label">
                      <Input
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) => enabledSetter(e.target.checked)}
                      />{" "}
                      {t("Enable dual currency display")}
                    </label>
                  </FormGroup>
                  <FormGroup check className="mb-3">
                    <label className="form-check-label">
                      <Input
                        type="checkbox"
                        checked={autoBcv}
                        onChange={(e) => {
                          autoBcvSetter(e.target.checked);
                          if (e.target.checked) {
                            fetchBcvRate();
                          }
                        }}
                      />{" "}
                      {t("Auto BCV rate")}
                    </label>
                  </FormGroup>
                </Col>
              </Row>

              {autoBcv && (
                <Row className="mb-3">
                  <Col md="8">
                    <Alert color="info" className="mb-0">
                      {loading ? (
                        <span>
                          <Spinner size="sm" color="primary" />{" "}
                          {t("Fetching BCV rate")}
                        </span>
                      ) : (
                        <span>
                          <strong>{t("BCV rate")}:</strong> 1 USD ={" "}
                          {exchangeRate} Bs.
                          {rateDate && (
                            <span className="d-block text-muted mt-1">
                              {t("BCV date")}: {rateDate}
                            </span>
                          )}
                          {rateFetchedAt && (
                            <span className="d-block text-muted">
                              {t("Last updated")}:{" "}
                              {new Date(rateFetchedAt).toLocaleString()}
                            </span>
                          )}
                        </span>
                      )}
                    </Alert>
                    {fetchError && (
                      <Alert color="warning" className="mt-2 mb-0">
                        {fetchError}. {t("BCV manual fallback")}
                      </Alert>
                    )}
                  </Col>
                  <Col md="4" className="d-flex align-items-start">
                    <Button
                      color="secondary"
                      block
                      type="button"
                      disabled={loading}
                      onClick={fetchBcvRate}
                    >
                      {t("Refresh BCV rate")}
                    </Button>
                  </Col>
                </Row>
              )}

              <Row>
                <Col md="3">
                  <label>{t("Primary Currency")}</label>
                  <FormGroup>
                    <Input
                      type="select"
                      value={primaryCode}
                      onChange={(e) => {
                        const code = e.target.value;
                        primaryCodeSetter(code);
                        if (code === "USD") primarySymbolSetter("$");
                        if (code === "VES") primarySymbolSetter("Bs.");
                      }}
                    >
                      <option value="USD">USD — Dólar</option>
                      <option value="VES">VES — Bolívar</option>
                    </Input>
                  </FormGroup>
                </Col>
                <Col md="2">
                  <label>{t("Currency Symbol")}</label>
                  <FormGroup>
                    <Input
                      value={primarySymbol}
                      onChange={(e) => primarySymbolSetter(e.target.value)}
                    />
                  </FormGroup>
                </Col>
                <Col md="3">
                  <label>{t("Secondary Currency")}</label>
                  <FormGroup>
                    <Input
                      type="select"
                      value={secondaryCode}
                      onChange={(e) => {
                        const code = e.target.value;
                        secondaryCodeSetter(code);
                        if (code === "USD") secondarySymbolSetter("$");
                        if (code === "VES") secondarySymbolSetter("Bs.");
                      }}
                    >
                      <option value="VES">VES — Bolívar (Bs)</option>
                      <option value="USD">USD — Dólar ($)</option>
                    </Input>
                  </FormGroup>
                </Col>
                <Col md="2">
                  <label>{t("Currency Symbol")}</label>
                  <FormGroup>
                    <Input
                      value={secondarySymbol}
                      onChange={(e) => secondarySymbolSetter(e.target.value)}
                    />
                  </FormGroup>
                </Col>
                <Col md="2">
                  <label>{t("Exchange Rate")}</label>
                  <FormGroup>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.001"
                      value={exchangeRate}
                      readOnly={autoBcv}
                      onChange={(e) => exchangeRateSetter(e.target.value)}
                      placeholder="36.50"
                    />
                  </FormGroup>
                </Col>
              </Row>
              <Row>
                <Col md="8">
                  <p className="text-muted mb-2">
                    {t("Exchange rate example", {
                      primary: primaryCode,
                      secondary: secondaryCode,
                      rate: exchangeRate,
                      sample: sample,
                    })}
                  </p>
                </Col>
                <Col md="4">
                  <Button color="primary" block type="submit">
                    {t("Save")}
                  </Button>
                </Col>
              </Row>
              {saved && (
                <Alert color="success" className="mt-2 mb-0">
                  {t("Success")}! {t("Multi-Currency saved locally")}
                </Alert>
              )}
            </div>
          </Form>
        </Card>
      </div>
    </Row>
  );
}

export default withTranslation()(MultiCurrency);
