/* eslint-disable react/display-name */
import React, { useState } from "react";
import gql from "graphql-tag";
import { Query, Mutation, compose, withApollo } from "react-apollo";
import { withTranslation } from "react-i18next";
import CategoryComponent from "../components/Category/Category";
import SortableDataTable from "../components/SortableDataTable";
// reactstrap components
import { Badge, Card, Container, Row, Modal } from "reactstrap";
// core components
import Header from "../components/Headers/Header.jsx";
import {
  categories,
  deleteCategory,
  getFoodsList,
  reorderCategories,
} from "../apollo/server";
import Loader from "react-loader-spinner";
import Alert from "../components/Alert";
import { formatGraphqlError } from "../utils/graphqlError";

const GET_CATEGORIES = gql`
  ${categories}
`;
const DELETE_CATEGORY = gql`
  ${deleteCategory}
`;
const REORDER_CATEGORIES = gql`
  ${reorderCategories}
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

  const columns = [
    {
      name: t("Title"),
      selector: "title",
    },
    {
      name: t("Description"),
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
      skipDropWrap: true,
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
      <Container className="mt--7" fluid>
        <CategoryComponent />
        <Row className="mt-5">
          <div className="col">
            <Card className="shadow">
              {deleteAlert && (
                <Alert
                  message={deleteAlert.message}
                  severity={deleteAlert.severity}
                />
              )}
              <Query query={GET_CATEGORIES} fetchPolicy="network-only">
                {({ loading, error, data }) => {
                  if (error) {
                    return (
                      <span>
                        `${t("Error")}! ${error.message}`
                      </span>
                    );
                  }
                  return (
                    <Mutation
                      mutation={REORDER_CATEGORIES}
                      refetchQueries={[{ query: GET_CATEGORIES }]}
                    >
                      {(reorderMutate, { loading: reordering }) => (
                        <SortableDataTable
                          title={t("Categories")}
                          columns={columns}
                          data={(data && data.categories) || []}
                          loading={loading}
                          reordering={reordering}
                          onReorder={(ids) =>
                            reorderMutate({ variables: { ids } }).then(
                              function (r) {
                                return r;
                              }
                            )
                          }
                          hint={t("Drag to reorder")}
                          t={t}
                        />
                      )}
                    </Mutation>
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
