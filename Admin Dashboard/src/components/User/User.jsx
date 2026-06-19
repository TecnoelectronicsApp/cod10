/* eslint-disable camelcase */
import React, { useState } from 'react'
import gql from 'graphql-tag'
import { Mutation } from 'react-apollo'
import { withTranslation } from 'react-i18next'
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  FormGroup,
  Form,
  Input,
  Row,
  Col,
  UncontrolledAlert
} from 'reactstrap'
import { createUser, getUsers } from '../../apollo/server'
import Loader from 'react-loader-spinner'

const CREATE_USER = gql`
  ${createUser}
`
const GET_USERS = gql`
  ${getUsers}
`

function UserForm(props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [mainError, setMainError] = useState('')
  const [success, setSuccess] = useState('')
  const [nameError, setNameError] = useState(null)
  const [emailError, setEmailError] = useState(null)
  const [phoneError, setPhoneError] = useState(null)
  const [passwordError, setPasswordError] = useState(null)

  const onBlur = (setter, isValid) => {
    setter(isValid)
  }

  const onSubmitValidation = () => {
    const nErr = name.trim().length > 0
    const eErr = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    const pErr = phone.trim().length >= 6
    const pwErr = password.trim().length >= 4
    setNameError(nErr)
    setEmailError(eErr)
    setPhoneError(pErr)
    setPasswordError(pwErr)
    return nErr && eErr && pErr && pwErr
  }

  const clearFields = () => {
    setName('')
    setEmail('')
    setPhone('')
    setPassword('')
    setNameError(null)
    setEmailError(null)
    setPhoneError(null)
    setPasswordError(null)
  }

  const onCompleted = () => {
    clearFields()
    setSuccess('Usuario creado correctamente')
    setMainError('')
    if (props.onSuccess) props.onSuccess()
    setTimeout(() => setSuccess(''), 4000)
  }

  const onError = err => {
    const msg =
      err?.graphQLErrors?.[0]?.message ||
      err?.message ||
      'No se pudo crear el usuario'
    setMainError(msg)
    setSuccess('')
  }

  const { t } = props

  return (
    <Card className="bg-secondary shadow">
      <CardHeader className="bg-white border-0">
        <h3 className="mb-0">{t('Add User')}</h3>
      </CardHeader>
      <CardBody>
        <Mutation
          mutation={CREATE_USER}
          onCompleted={onCompleted}
          onError={onError}
          refetchQueries={[{ query: GET_USERS, variables: { page: 0 } }]}>
          {(mutate, { loading }) => {
            if (loading) {
              return (
                <Loader
                  className="text-center"
                  type="TailSpin"
                  color="#fb6340"
                  height={80}
                  width={80}
                  visible={loading}
                />
              )
            }
            return (
              <Form
                onSubmit={e => {
                  e.preventDefault()
                  setMainError('')
                  setSuccess('')
                  if (onSubmitValidation()) {
                    mutate({
                      variables: { name, email, phone, password }
                    })
                  }
                }}>
                <Row>
                  <Col md="6">
                    <FormGroup
                      className={
                        nameError === null
                          ? ''
                          : nameError
                            ? 'has-success'
                            : 'has-danger'
                      }>
                      <label>{t('Name')}</label>
                      <Input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        onBlur={() => onBlur(setNameError, name.trim().length > 0)}
                        placeholder="Nombre completo"
                      />
                    </FormGroup>
                  </Col>
                  <Col md="6">
                    <FormGroup
                      className={
                        emailError === null
                          ? ''
                          : emailError
                            ? 'has-success'
                            : 'has-danger'
                      }>
                      <label>{t('Email')}</label>
                      <Input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        onBlur={() =>
                          onBlur(
                            setEmailError,
                            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
                          )
                        }
                        placeholder="correo@ejemplo.com"
                      />
                    </FormGroup>
                  </Col>
                </Row>
                <Row>
                  <Col md="6">
                    <FormGroup
                      className={
                        phoneError === null
                          ? ''
                          : phoneError
                            ? 'has-success'
                            : 'has-danger'
                      }>
                      <label>{t('Phone')}</label>
                      <Input
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        onBlur={() => onBlur(setPhoneError, phone.trim().length >= 6)}
                        placeholder="+58 412 0000000"
                      />
                    </FormGroup>
                  </Col>
                  <Col md="6">
                    <FormGroup
                      className={
                        passwordError === null
                          ? ''
                          : passwordError
                            ? 'has-success'
                            : 'has-danger'
                      }>
                      <label>{t('Password')}</label>
                      <Input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        onBlur={() =>
                          onBlur(setPasswordError, password.trim().length >= 4)
                        }
                        placeholder="Contraseña"
                      />
                    </FormGroup>
                  </Col>
                </Row>
                {success && (
                  <UncontrolledAlert color="success">{success}</UncontrolledAlert>
                )}
                {mainError && (
                  <UncontrolledAlert color="danger">{mainError}</UncontrolledAlert>
                )}
                <Button color="primary" type="submit" block>
                  {t('Save')}
                </Button>
              </Form>
            )
          }}
        </Mutation>
      </CardBody>
    </Card>
  )
}

export default withTranslation()(UserForm)
