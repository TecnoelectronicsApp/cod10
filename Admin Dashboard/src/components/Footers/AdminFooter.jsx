/*eslint-disable*/
import React from "react";
import { withTranslation } from "react-i18next";
import { Row, Col, Nav, NavItem, NavLink } from "reactstrap";
import { APP_NAME } from "../../config/branding";

function Footer(props) {
  const { t } = props;
  return (
    <footer className="footer">
      <Row className="align-items-center justify-content-xl-between">
        <Col xl="6">
          <div className="copyright text-center text-xl-left text-muted">
            © {t("2019-20")}{" "}
            <span className="font-weight-bold ml-1">{APP_NAME}</span>
          </div>
        </Col>

        <Col xl="6">
          <Nav className="nav-footer justify-content-center justify-content-xl-end">
            <NavItem>
              <NavLink href="/admin/dashboard">{APP_NAME}</NavLink>
            </NavItem>

            <NavItem>
              <NavLink
                href="https://cod10.vercel.app"
                rel="noopener noreferrer"
                target="_blank"
              >
                {t("About Us")}
              </NavLink>
            </NavItem>

            <NavItem>
              <NavLink
                href="https://cod10.vercel.app"
                rel="noopener noreferrer"
                target="_blank"
              >
                {t("Blog")}
              </NavLink>
            </NavItem>
          </Nav>
        </Col>
      </Row>
    </footer>
  );
}

export default withTranslation()(Footer);
