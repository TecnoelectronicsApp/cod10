/* eslint-disable react/display-name */
import React, { useState } from 'react'
import { withTranslation } from 'react-i18next'
import { Container, Row, Card, Badge, Modal, Alert } from 'reactstrap'
import Header from '../components/Headers/Header.jsx'
import CustomLoader from '../components/Loader/CustomLoader'
import UserForm from '../components/User/User.jsx'
import { Query, compose, withApollo } from 'react-apollo'
import gql from 'graphql-tag'
import { getUsers } from '../apollo/server'
import { transformToNewline } from '../utils/stringManipulations'
import DataTable from 'react-data-table-component'
import orderBy from 'lodash.orderby'

const GET_USERS = gql`
  ${getUsers}
`

const Users = props => {
  const [addModal, setAddModal] = useState(false)
  const [infoMessage, setInfoMessage] = useState('')

  const columns = [
    {
      name: 'Name',
      sortable: true,
      selector: 'name'
    },
    {
      name: 'Email',
      sortable: true,
      selector: 'email',
      cell: row => hiddenData(row.email, 'EMAIL')
    },
    {
      name: 'Phone',
      sortable: true,
      selector: 'phone',
      cell: row => hiddenData(row.phone, 'PHONE')
    },
    {
      name: 'Address',
      cell: row => (
        <>
          {transformToNewline(
            row.addresses && row.addresses.length
              ? row.addresses[0].delivery_address
              : '',
            15
          )}
        </>
      )
    },
    {
      name: 'Action',
      cell: row => (
        <Badge
          color="secondary"
          style={{ cursor: 'pointer' }}
          onClick={() => {
            setInfoMessage(
              `El usuario "${row.name}" pertenece al API demo compartido. ` +
                'No se puede eliminar desde el panel; solo puedes agregar nuevos usuarios.'
            )
            setTimeout(() => setInfoMessage(''), 6000)
          }}>
          Info
        </Badge>
      )
    }
  ]

  const hiddenData = (cell, column) => {
    if (column === 'EMAIL') {
      if (cell != null) {
        const splitArray = cell.split('@')
        splitArray.splice(0, 1, '*'.repeat(splitArray[0].length))
        return splitArray.join('@')
      }
      return '*'
    }
    if (column === 'PHONE') {
      if (!cell) return '-'
      return '*'.repeat(cell.length)
    }
  }

  const customSort = (rows, field, direction) => {
    const handleField = row => {
      if (row[field]) {
        return row[field].toLowerCase()
      }
      return row[field]
    }
    return orderBy(rows, handleField, direction)
  }

  const handleSort = (column, sortDirection) =>
    console.log(column.selector, sortDirection)

  const { t } = props

  return (
    <>
      <Header />
      <Container className="mt--7" fluid>
        <Row className="mb-3">
          <div className="col text-right">
            <Badge
              color="primary"
              style={{ cursor: 'pointer', fontSize: '0.9rem', padding: '8px 16px' }}
              onClick={() => setAddModal(true)}>
              + {t('Add User')}
            </Badge>
          </div>
        </Row>
        {infoMessage && (
          <Row className="mb-3">
            <div className="col">
              <Alert color="warning">{infoMessage}</Alert>
            </div>
          </Row>
        )}
        <Row>
          <div className="col">
            <Card className="shadow">
              <Query
                query={GET_USERS}
                variables={{ page: 0 }}
                onError={error => {
                  console.log(error)
                }}>
                {({ loading, error, data }) => {
                  if (error) {
                    return (
                      <Alert color="danger" className="m-3">
                        {t('Error')}! {error.message}
                      </Alert>
                    )
                  }
                  return (
                    <DataTable
                      title={t('Users')}
                      columns={columns}
                      data={data && data.users ? data.users : []}
                      pagination
                      progressPending={loading}
                      progressComponent={<CustomLoader />}
                      onSort={handleSort}
                      sortFunction={customSort}
                    />
                  )
                }}
              </Query>
            </Card>
          </div>
        </Row>
      </Container>

      <Modal
        className="modal-dialog-centered"
        size="lg"
        isOpen={addModal}
        toggle={() => setAddModal(false)}>
        <UserForm onSuccess={() => setAddModal(false)} />
      </Modal>
    </>
  )
}

export default compose(withApollo, withTranslation())(Users)
