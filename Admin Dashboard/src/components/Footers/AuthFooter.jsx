/*eslint-disable*/
import React from "react";
import { withTranslation } from "react-i18next";
import { NavItem, NavLink, Nav, Container, Row, Col } from "reactstrap";
import { APP_NAME } from "../../config/branding";

function AuthFooter(props) {
  const { t } = props;
  return (
    <>
      <footer className="py-5">
        <Container>
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
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t("About Us")}
                  </NavLink>
                </NavItem>
                <NavItem>
                  <NavLink
                    href="https://cod10.vercel.app"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t("Blog")}
                  </NavLink>
                </NavItem>
              </Nav>
            </Col>
          </Row>
        </Container>
      </footer>
    </>
  );
}

export default withTranslation()(AuthFooter);
