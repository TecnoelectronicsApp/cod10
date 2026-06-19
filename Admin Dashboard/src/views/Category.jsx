/* eslint-disable react/display-name */
import React, { useState } from "react";
import gql from "graphql-tag";
import { Query, Mutation, compose, withApollo } from "react-apollo";
import { withTranslation } from "react-i18next";
import CategoryComponent from "../components/Category/Category";
import CustomLoader from "../components/Loader/CustomLoader";
// reactstrap components
import { Badge, Card, Container, Row, Modal } from "reactstrap";
// core components
import Header from "../components/Headers/Header.jsx";
import { categories, deleteCategory, getFoodsList } from "../apollo/server";
import DataTable from "react-data-table-component";
import orderBy from "lodash/orderBy";
import Loader from "react-loader-spinner";
import Alert from "../components/Alert";
import { formatGraphqlError } from "../utils/graphqlError";

const GET_CATEGORIES = gql`
  ${categories}
`;
const DELETE_CATEGORY = gql`
  ${deleteCategory}
`;
const GET_FOODS_LIST = gql`
  ${getFoodsList}
`;

const Category = (props) => {
  const [editModal, setEditModal] = useState(false);
  const [category, setCategory] = useState(null);
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

  const toggleModal = (category) => {
    setEditModal(!editModal);
    setCategory(category);
  };

  const customSort = (rows, field, direction) => {
    const handleField = (row) => {
      if (row[field]) {
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
      name: t("Title"),
      sortable: true,
      selector: "title",
    },
    {
      name: t("Description"),
      sortable: true,
      selector: "description",
    },
    {
      name: t("Image"),
      cell: (row) => (
        <>
          {!!row.img_menu && (
            <img className="img-responsive" src={row.img_menu} alt="img menu" />
          )}
          {!row.img_menu && t("No Image")}
        </>
      ),
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
          {t("Edit")}
        </Badge>
        &nbsp;&nbsp;
        <Mutation
          mutation={DELETE_CATEGORY}
          refetchQueries={[
            { query: GET_CATEGORIES },
            { query: GET_FOODS_LIST, variables: { page: 0 } },
          ]}
        >
          {(deleteCategoryMut, { loading: deleteLoading }) => {
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
              <Badge
                href="#pablo"
                color="danger"
                onClick={(e) => {
                  e.preventDefault();
                  confirmDelete(deleteCategoryMut, row._id);
                }}
              >
                {t("Delete")}
              </Badge>
            );
          }}
        </Mutation>
      </>
    );
  };
  return (
    <>
      <Header />
      {/* Page content */}
      <Container className="mt--7" fluid>
        <CategoryComponent />
        {/* Table */}
        <Row className="mt-5">
          <div className="col">
            <Card className="shadow">
              {deleteAlert && (
                <Alert
                  message={deleteAlert.message}
                  severity={deleteAlert.severity}
                />
              )}
              <Query query={GET_CATEGORIES} variables={{ page: 0 }}>
                {({ loading, error, data }) => {
                  if (error) {
                    return (
                      <span>
                        `${t("Error")}! ${error.message}`
                      </span>
                    );
                  }
                  return (
                    <DataTable
                      title={t("Categories")}
                      columns={columns}
                      data={data.categories}
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
            toggleModal(null);
          }}
        >
          <CategoryComponent category={category} />
        </Modal>
      </Container>
    </>
  );
};
export default compose(withApollo, withTranslation())(Category);
