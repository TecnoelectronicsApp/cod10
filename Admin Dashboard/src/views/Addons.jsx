/* eslint-disable react/display-name */
import React, { useState } from "react";
import { Container, Badge, Row, Card, Modal } from "reactstrap";
import Header from "../components/Headers/Header.jsx";
import AddonComponent from "../components/Addon/Addon";
import { addons, deleteAddon } from "../apollo/server";
import CustomLoader from "../components/Loader/CustomLoader";
import DataTable from "react-data-table-component";
import orderBy from "lodash/orderBy";
import { withTranslation } from "react-i18next";
import gql from "graphql-tag";
import { Query, Mutation, compose, withApollo } from "react-apollo";
import Loader from "react-loader-spinner";
import Alert from "../components/Alert";
import { formatGraphqlError } from "../utils/graphqlError";

const GET_ADDONS = gql`
  ${addons}
`;
const DELETE_ADDON = gql`
  ${deleteAddon}
`;

const Addon = (props) => {
  const [addon, setAddon] = useState(null);
  const [editModal, setEditModal] = useState(false);
  const [deleteAlert, setDeleteAlert] = useState(null);
  const { t } = props;

  const showDeleteAlert = (message, severity) => {
    setDeleteAlert({ message: message, severity: severity });
    setTimeout(
      function () {
        setDeleteAlert(null);
      },
      severity === "success" ? 3000 : 5000
    );
  };

  const confirmDelete = (mutateFn, id) => {
    if (!window.confirm(t("Delete confirm"))) return;
    mutateFn({ variables: { id: id } })
      .then(function () {
        showDeleteAlert(t("Delete success"), "success");
      })
      .catch(function (err) {
        showDeleteAlert(formatGraphqlError(err) || t("Delete error"), "danger");
      });
  };

  const toggleModal = (addon) => {
    setEditModal(!editModal);
    setAddon(addon);
  };

  const customSort = (rows, field, direction) => {
    const handleField = (row) => {
      if (row[field] && isNaN(row[field])) {
        return row[field].toLowerCase();
      }

      return row[field];
    };

    return orderBy(rows, handleField, direction);
  };

  const handleSort = (column, sortDirection) =>
    console.log(column.selector, sortDirection);

  const columns = [
    {
      name: "Title",
      sortable: true,
      selector: "title",
    },
    {
      name: "Description",
      sortable: true,
      selector: "description",
    },
    {
      name: "Minimum",
      sortable: true,
      selector: "quantity_minimum",
    },
    {
      name: "Maximum",
      sortable: true,
      selector: "quantity_maximum",
    },
    {
      name: "Action",
      cell: (row) => <>{actionButtons(row)}</>,
    },
  ];

  const actionButtons = (row) => {
    return (
      <>
        <Badge
          href="#pablo"
          onClick={(e) => {
            e.preventDefault();
            toggleModal(row);
          }}
          color="primary"
        >
          Edit
        </Badge>
        &nbsp;&nbsp;
        <Mutation mutation={DELETE_ADDON} update={update}>
          {(deleteAddonMut, { loading: deleteLoading }) => {
            if (deleteLoading) {
              return (
                <Loader
                  type="ThreeDots"
                  color="#BB2124"
                  height={20}
                  width={40}
                  visible={deleteLoading}
                />
              );
            }
            return (
              <>
                <Badge
                  href="#pablo"
                  color="danger"
                  onClick={(e) => {
                    e.preventDefault();
                    confirmDelete(deleteAddonMut, row._id);
                  }}
                >
                  {t("Delete")}
                </Badge>
              </>
            );
          }}
        </Mutation>
      </>
    );
  };

  const update = (proxy, { data: { deleteAddon } }) => {
    try {
      if (deleteAddon) {
        const data = proxy.readQuery({ query: GET_ADDONS });
        data.addons = data.addons.filter((addon) => addon._id !== deleteAddon);
        proxy.writeQuery({ query: GET_ADDONS, data });
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <>
      <Header />
      {/* Page content */}
      <Container className="mt--7" fluid>
        <AddonComponent />
        <Row className="mt-5">
          <div className="col">
            <Card className="shadow">
              {deleteAlert && (
                <Alert
                  message={deleteAlert.message}
                  severity={deleteAlert.severity}
                />
              )}
              <Query query={GET_ADDONS} variables={{ page: 0 }}>
                {({ loading, error, data }) => {
                  if (error) {
                    return (
                      <tr>
                        <td>
                          `${t("Error")}! ${error.message}`
                        </td>
                      </tr>
                    );
                  }
                  return (
                    <DataTable
                      title={t("Addons")}
                      columns={columns}
                      data={data.allAddons}
                      pagination
                      progressPending={loading}
                      progressComponent={<CustomLoader />}
                      onSort={handleSort}
                      sortFunction={customSort}
                      defaultSortField="title"
                    />
                  );
                }}
              </Query>
            </Card>
          </div>
        </Row>
        <Modal
          className="modal-dialog-centered"
          size="lg"
          isOpen={editModal}
          toggle={() => {
            toggleModal();
          }}
        >
          <AddonComponent addon={addon} />
        </Modal>
      </Container>
    </>
  );
};

export default compose(withApollo, withTranslation())(Addon);
