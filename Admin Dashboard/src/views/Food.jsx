/* eslint-disable react/display-name */
import React, { useState, useRef, useCallback } from "react";
import gql from "graphql-tag";
import { Query, Mutation, compose, withApollo } from "react-apollo";
import { withTranslation } from "react-i18next";
import { Badge, Card, Container, Row, Media, Modal, Spinner } from "reactstrap";
import Header from "../components/Headers/Header.jsx";
import {
  getFoodsList,
  deleteFood,
  foodByIds,
  reorderFoods,
} from "../apollo/server";
import FoodComponent from "../components/Food/Food";
import SortableDataTable from "../components/SortableDataTable";
import { transformToNewline } from "../utils/stringManipulations";
import Loader from "react-loader-spinner";
import Alert from "../components/Alert";
import { formatGraphqlError } from "../utils/graphqlError";

const GET_FOODS_LIST = gql`
  ${getFoodsList}
`;
const GET_FOOD_DETAIL = gql`
  ${foodByIds}
`;
const DELETE_FOOD = gql`
  ${deleteFood}
`;
const REORDER_FOODS = gql`
  ${reorderFoods}
`;

const Food = (props) => {
  const [editModal, setEditModal] = useState(false);
  const [food, setFood] = useState(null);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [deleteAlert, setDeleteAlert] = useState(null);
  const listRefetchRef = useRef(null);
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

  const handleSaved = useCallback(() => {
    if (listRefetchRef.current) {
      listRefetchRef.current().catch(function () {});
    }
  }, []);

  const closeEditModal = () => {
    setEditModal(false);
    setFood(null);
    setLoadingEdit(false);
  };

  const openEditModal = async (row) => {
    setEditModal(true);
    setLoadingEdit(true);
    setFood(null);
    try {
      const result = await props.client.query({
        query: GET_FOOD_DETAIL,
        variables: { ids: [row._id] },
        fetchPolicy: "network-only",
      });
      const full = result.data.foodByIds && result.data.foodByIds[0];
      setFood(full || row);
    } catch (e) {
      setFood(row);
    } finally {
      setLoadingEdit(false);
    }
  };

  const actionButtons = (row) => {
    return (
      <>
        <Badge
          href="#pablo"
          onClick={(e) => {
            e.preventDefault();
            openEditModal(row);
          }}
          color="primary"
        >
          {t("Edit")}
        </Badge>
        &nbsp;&nbsp;
        <Mutation
          mutation={DELETE_FOOD}
          refetchQueries={[{ query: GET_FOODS_LIST, variables: { page: 0 } }]}
        >
          {(deleteFoodMut, { loading: deleteLoading }) => {
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
                  confirmDelete(deleteFoodMut, row._id);
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

  const columns = [
    {
      name: t("Title"),
      selector: "title",
      cell: (row) => (
        <Media>
          <span className="mb-0 text-sm">{row.title}</span>
        </Media>
      ),
    },
    {
      name: t("Description"),
      selector: "description",
      cell: (row) => <>{transformToNewline(row.description, 3)}</>,
    },
    {
      name: t("Category"),
      cell: (row) => <>{row.category && row.category.title}</>,
    },
    {
      name: t("Image"),
      cell: (row) => (
        <>
          {!!row.img_url && (
            <img className="img-responsive" src={row.img_url} alt="img menu" />
          )}
          {!row.img_url && t("No Image")}
        </>
      ),
    },
    {
      name: t("Action"),
      skipDropWrap: true,
      cell: (row) => <>{actionButtons(row)}</>,
    },
  ];

  return (
    <>
      <Header />
      <Container className="mt--7" fluid>
        <Query
          query={GET_FOODS_LIST}
          variables={{ page: 0 }}
          fetchPolicy="network-only"
        >
          {({ loading, error, data, refetch }) => {
            listRefetchRef.current = refetch;
            return (
              <>
                <FoodComponent onSaved={handleSaved} />
                <Row className="mt-5">
                  <div className="col">
                    <Card className="shadow">
                      {deleteAlert && (
                        <Alert
                          message={deleteAlert.message}
                          severity={deleteAlert.severity}
                        />
                      )}
                      {error && (
                        <div className="p-4 text-danger">
                          {t("Error")}! {formatGraphqlError(error)}
                        </div>
                      )}
                      <Mutation
                        mutation={REORDER_FOODS}
                        refetchQueries={[
                          { query: GET_FOODS_LIST, variables: { page: 0 } },
                        ]}
                      >
                        {(reorderMutate, { loading: reordering }) => (
                          <SortableDataTable
                            title={t("Foods")}
                            columns={columns}
                            data={(data && data.foods) || []}
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
                    </Card>
                  </div>
                </Row>
              </>
            );
          }}
        </Query>
        <Modal
          className="modal-dialog-centered"
          size="lg"
          isOpen={editModal}
          toggle={closeEditModal}
        >
          {loadingEdit ? (
            <div className="p-5 text-center">
              <Spinner color="primary" />
              <p className="mt-3 text-muted">{t("Loading")}</p>
            </div>
          ) : (
            <FoodComponent
              key={food ? food._id : "edit"}
              food={food}
              onSaved={() => {
                handleSaved();
                closeEditModal();
              }}
            />
          )}
        </Modal>
      </Container>
    </>
  );
};

export default compose(withApollo, withTranslation())(Food);
