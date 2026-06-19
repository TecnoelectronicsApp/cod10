import React, { useEffect, useState } from "react";
import { withTranslation } from "react-i18next";
import { Alert, Button, CardBody } from "reactstrap";
import OrdersData from "./OrderData";
import {
  formatGraphqlError,
  isTransientServerError,
  userFriendlyGraphqlMessage,
} from "../../utils/graphqlError";

function OrdersQueryView(props) {
  const {
    t,
    loading,
    error,
    data,
    refetch,
    subscribeToMore,
    toggleModal,
    order,
    setOrder,
    setSearch,
    setPage,
    setRowsPerPage,
  } = props;
  const [autoRetrying, setAutoRetrying] = useState(false);

  useEffect(
    function () {
      if (!error || (data && data.allOrders)) return undefined;
      const msg = formatGraphqlError(error);
      if (!isTransientServerError(msg)) return undefined;

      setAutoRetrying(true);
      const timer = setTimeout(function () {
        refetch().finally(function () {
          setAutoRetrying(false);
        });
      }, 2500);

      return function () {
        clearTimeout(timer);
      };
    },
    [error, data, refetch]
  );

  if (error && !(data && data.allOrders)) {
    const msg = userFriendlyGraphqlMessage(formatGraphqlError(error), t);
    return (
      <CardBody className="py-5 text-center">
        <Alert color="warning" className="mb-3">
          {msg}
        </Alert>
        <Button
          color="primary"
          disabled={loading || autoRetrying}
          onClick={function () {
            refetch();
          }}
        >
          {autoRetrying ? t("Loading") + "…" : t("Retry")}
        </Button>
      </CardBody>
    );
  }

  return (
    <OrdersData
      orders={(data && data.allOrders) || []}
      toggleModal={toggleModal}
      subscribeToMore={subscribeToMore}
      loading={loading}
      selected={order}
      updateSelected={setOrder}
      search={setSearch}
      page={setPage}
      rows={setRowsPerPage}
    />
  );
}

export default withTranslation()(OrdersQueryView);
