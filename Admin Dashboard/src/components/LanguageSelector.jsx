import React, { useState, useEffect } from "react";
import { withTranslation } from "react-i18next";
import { FormGroup, Input } from "reactstrap";

function LanguageSelector(props) {
  const [lang, langSetter] = useState(
    localStorage.getItem("enatega-language") || props.i18n.language || "es"
  );

  useEffect(
    function () {
      const onLangChanged = (lng) => langSetter(lng);
      props.i18n.on("languageChanged", onLangChanged);
      return function () {
        props.i18n.off("languageChanged", onLangChanged);
      };
    },
    [props.i18n]
  );

  const handleChange = (event) => {
    const value = event.target.value;
    localStorage.setItem("enatega-language", value);
    props.i18n.changeLanguage(value);
    langSetter(value);
  };

  return (
    <FormGroup className="mb-0">
      <Input
        type="select"
        bsSize="sm"
        value={lang}
        onChange={handleChange}
        aria-label={props.t("Language")}
      >
        <option value="es">Español</option>
        <option value="en">English</option>
        <option value="de">Deutsche</option>
        <option value="fr">Français</option>
        <option value="zh">中文</option>
        <option value="km">ភាសាខ្មែរ</option>
      </Input>
    </FormGroup>
  );
}

export default withTranslation()(LanguageSelector);
