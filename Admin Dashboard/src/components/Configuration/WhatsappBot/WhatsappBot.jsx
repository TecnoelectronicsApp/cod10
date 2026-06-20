import React, { useState, useEffect, useRef, useCallback } from "react";

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
  Badge,
} from "reactstrap";

import { STORE_CONFIG_CLOUDINARY_URL } from "../../../utils/paymentMethods";

import {
  defaultWhatsappBotConfig,
  loadWhatsappBotConfig,
  syncWhatsappBotToServer,
} from "../../../utils/whatsappBot";

import {
  openwaGetSession,
  openwaStartSession,
  openwaGetQr,
  openwaCreateSession,
  isSessionOnline,
  needsQrScan,
  statusLabelKey,
} from "../../../utils/openwaClient";

function WhatsappBot(props) {
  const { t } = props;

  const [bot, botSetter] = useState(defaultWhatsappBotConfig);

  const [saved, savedSetter] = useState(false);

  const [cloudinaryOk, cloudinaryOkSetter] = useState(false);

  const [remoteOk, remoteOkSetter] = useState(false);

  const [error, errorSetter] = useState("");

  const [loading, loadingSetter] = useState(true);

  const [waStatus, waStatusSetter] = useState(null);

  const [waPhone, waPhoneSetter] = useState("");

  const [waError, waErrorSetter] = useState("");

  const [waLoading, waLoadingSetter] = useState(false);

  const [qrImage, qrImageSetter] = useState("");

  const pollRef = useRef(null);

  useEffect(function () {
    loadWhatsappBotConfig()
      .then(function (cfg) {
        botSetter(cfg);
      })

      .finally(function () {
        loadingSetter(false);
      });

    return function () {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const updateField = (field, value) => {
    botSetter(Object.assign({}, bot, { [field]: value }));
  };

  const canCallOpenwa = () => {
    return (
      bot.openwaBaseUrl &&
      bot.openwaBaseUrl.trim() &&
      bot.openwaApiKey &&
      bot.openwaApiKey.trim()
    );
  };

  const refreshWhatsApp = useCallback(
    async function (tryFetchQr) {
      if (!canCallOpenwa()) {
        waErrorSetter(t("OpenWA credentials missing"));

        return;
      }

      waLoadingSetter(true);

      waErrorSetter("");

      try {
        let sessionId = bot.openwaSessionId;

        if (!sessionId || !sessionId.trim()) {
          const created = await openwaCreateSession(
            bot.openwaBaseUrl,

            bot.openwaApiKey,

            "codigo10"
          );

          sessionId = created.id;

          updateField("openwaSessionId", sessionId);

          botSetter(function (prev) {
            return Object.assign({}, prev, { openwaSessionId: sessionId });
          });
        }

        const session = await openwaGetSession(
          bot.openwaBaseUrl,

          bot.openwaApiKey,

          sessionId
        );

        waStatusSetter(session.status);

        waPhoneSetter(session.phone || session.pushName || "");

        if (tryFetchQr && needsQrScan(session.status)) {
          try {
            const qr = await openwaGetQr(
              bot.openwaBaseUrl,

              bot.openwaApiKey,

              sessionId
            );

            qrImageSetter(qr.qrCode || "");
          } catch (qrErr) {
            qrImageSetter("");
          }
        } else if (isSessionOnline(session.status)) {
          qrImageSetter("");
        }
      } catch (e) {
        waErrorSetter(e.message || String(e));

        waStatusSetter(null);
      } finally {
        waLoadingSetter(false);
      }
    },

    [bot.openwaBaseUrl, bot.openwaApiKey, bot.openwaSessionId, t]
  );

  const startWhatsApp = async function () {
    if (!canCallOpenwa()) {
      waErrorSetter(t("OpenWA credentials missing"));

      return;
    }

    waLoadingSetter(true);

    waErrorSetter("");

    try {
      let sessionId = bot.openwaSessionId;

      if (!sessionId || !sessionId.trim()) {
        const created = await openwaCreateSession(
          bot.openwaBaseUrl,

          bot.openwaApiKey,

          "codigo10"
        );

        sessionId = created.id;

        botSetter(function (prev) {
          return Object.assign({}, prev, { openwaSessionId: sessionId });
        });
      }

      await openwaStartSession(
        bot.openwaBaseUrl,

        bot.openwaApiKey,

        sessionId
      );

      await refreshWhatsApp(true);

      if (pollRef.current) clearInterval(pollRef.current);

      pollRef.current = setInterval(function () {
        refreshWhatsApp(true);
      }, 5000);
    } catch (e) {
      waErrorSetter(e.message || String(e));
    } finally {
      waLoadingSetter(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    errorSetter("");

    const result = await syncWhatsappBotToServer(bot);

    savedSetter(true);

    cloudinaryOkSetter(result.cloudinary);

    remoteOkSetter(result.remote);

    if (!result.ok) {
      errorSetter(
        result.cloudinaryError ||
          result.remoteError ||
          t("WhatsApp Bot save failed")
      );
    } else if (!result.cloudinary) {
      errorSetter(result.cloudinaryError || t("WhatsApp Bot local only"));
    }

    setTimeout(function () {
      savedSetter(false);
    }, 6000);
  };

  const resetDefaults = () => {
    botSetter(Object.assign({}, defaultWhatsappBotConfig));
  };

  const statusBadgeColor = function () {
    if (isSessionOnline(waStatus)) return "success";

    if (needsQrScan(waStatus)) return "warning";

    if (waStatus === "failed") return "danger";

    return "secondary";
  };

  return (
    <Row className="mt-3">
      <div className="col">
        <Card className="shadow">
          <CardHeader className="border-0">
            <h3 className="mb-0">{t("WhatsApp Bot")}</h3>

            <small className="text-muted d-block">
              {t("WhatsApp Bot help")}
            </small>

            <small className="text-muted d-block">
              Config: {STORE_CONFIG_CLOUDINARY_URL}
            </small>
          </CardHeader>

          <Form onSubmit={handleSave}>
            <div className="pl-lg-4 pb-4">
              {loading && (
                <Alert color="info" className="mb-3">
                  {t("Loading")}…
                </Alert>
              )}

              <FormGroup check className="mb-3">
                <label className="form-check-label">
                  <Input
                    type="checkbox"
                    checked={!!bot.enabled}
                    onChange={(e) => updateField("enabled", e.target.checked)}
                  />{" "}
                  <strong>{t("WhatsApp Bot enabled")}</strong>
                </label>
              </FormGroup>

              <Row>
                <Col md="8">
                  <label>{t("Gemini API Key")}</label>

                  <FormGroup>
                    <Input
                      type="password"
                      value={bot.geminiApiKey || ""}
                      placeholder="AIza..."
                      autoComplete="off"
                      onChange={(e) =>
                        updateField("geminiApiKey", e.target.value)
                      }
                    />
                  </FormGroup>
                </Col>

                <Col md="4">
                  <label>{t("Gemini model")}</label>

                  <FormGroup>
                    <Input
                      value={bot.geminiModel || "gemini-2.0-flash"}
                      onChange={(e) =>
                        updateField("geminiModel", e.target.value)
                      }
                    />
                  </FormGroup>
                </Col>
              </Row>

              <label>{t("Bot system prompt")}</label>

              <FormGroup>
                <Input
                  type="textarea"
                  rows={10}
                  value={bot.systemPrompt || ""}
                  placeholder={t("Bot prompt placeholder")}
                  onChange={(e) => updateField("systemPrompt", e.target.value)}
                />
              </FormGroup>

              <small className="text-muted d-block mb-4">
                {t("Bot prompt help")}
              </small>

              <h5 className="mb-3">{t("OpenWA connection")}</h5>

              <small className="text-muted d-block mb-3">
                {t("OpenWA connection help")}
              </small>

              <Row>
                <Col md="6">
                  <label>{t("OpenWA server URL")}</label>

                  <FormGroup>
                    <Input
                      value={bot.openwaBaseUrl || ""}
                      placeholder="https://openwa-cod10.onrender.com"
                      onChange={(e) =>
                        updateField("openwaBaseUrl", e.target.value)
                      }
                    />
                  </FormGroup>
                </Col>

                <Col md="6">
                  <label>{t("OpenWA session ID")}</label>

                  <FormGroup>
                    <Input
                      value={bot.openwaSessionId || ""}
                      placeholder="uuid-de-la-sesion"
                      onChange={(e) =>
                        updateField("openwaSessionId", e.target.value)
                      }
                    />
                  </FormGroup>
                </Col>
              </Row>

              <Row>
                <Col md="6">
                  <label>{t("OpenWA API Key")}</label>

                  <FormGroup>
                    <Input
                      type="password"
                      value={bot.openwaApiKey || ""}
                      placeholder="owa_..."
                      autoComplete="off"
                      onChange={(e) =>
                        updateField("openwaApiKey", e.target.value)
                      }
                    />
                  </FormGroup>
                </Col>

                <Col md="6">
                  <label>{t("Webhook secret")}</label>

                  <FormGroup>
                    <Input
                      type="password"
                      value={bot.webhookSecret || ""}
                      autoComplete="off"
                      onChange={(e) =>
                        updateField("webhookSecret", e.target.value)
                      }
                    />
                  </FormGroup>
                </Col>
              </Row>

              <Card className="bg-secondary mb-4 p-3">
                <h5 className="mb-2">{t("WhatsApp link status")}</h5>

                <p className="text-muted small mb-3">{t("WhatsApp QR help")}</p>

                <div className="mb-3">
                  {waStatus ? (
                    <Badge color={statusBadgeColor()} className="p-2">
                      {t(statusLabelKey(waStatus))}

                      {waPhone ? " — " + waPhone : ""}
                    </Badge>
                  ) : (
                    <Badge color="light" className="p-2 text-dark">
                      {t("WA status unknown")}
                    </Badge>
                  )}
                </div>

                <Row className="mb-3">
                  <Col md="4">
                    <Button
                      color="info"
                      type="button"
                      block
                      disabled={waLoading}
                      onClick={function () {
                        refreshWhatsApp(true);
                      }}
                    >
                      {waLoading ? t("Loading") + "…" : t("Refresh WA status")}
                    </Button>
                  </Col>

                  <Col md="4">
                    <Button
                      color="success"
                      type="button"
                      block
                      disabled={waLoading}
                      onClick={startWhatsApp}
                    >
                      {t("Start WA session")}
                    </Button>
                  </Col>

                  <Col md="4">
                    <Button
                      color="link"
                      type="button"
                      block
                      href={
                        bot.openwaBaseUrl
                          ? bot.openwaBaseUrl.replace(/\/+$/, "")
                          : "#"
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t("Open OpenWA dashboard")}
                    </Button>
                  </Col>
                </Row>

                {qrImage && (
                  <div className="text-center mb-3">
                    <p className="font-weight-bold mb-2">
                      {t("Scan QR WhatsApp")}
                    </p>

                    <img
                      src={qrImage}
                      alt="WhatsApp QR"
                      style={{
                        maxWidth: "280px",

                        width: "100%",

                        border: "8px solid #fff",

                        borderRadius: "8px",
                      }}
                    />

                    <p className="text-muted small mt-2 mb-0">
                      {t("WhatsApp QR scan hint")}
                    </p>
                  </div>
                )}

                {waError && (
                  <Alert color="warning" className="mb-0">
                    {waError}
                  </Alert>
                )}
              </Card>

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
                  {t("Success")}! {t("WhatsApp Bot saved")} —{" "}
                  {t("Synced to client Cloudinary")}
                  {remoteOk && " + " + t("Synced to client API")}
                </Alert>
              )}

              {saved && !cloudinaryOk && (
                <Alert color="warning" className="mt-3 mb-0">
                  {t("WhatsApp Bot local only")}. {error}
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

export default withTranslation()(WhatsappBot);
