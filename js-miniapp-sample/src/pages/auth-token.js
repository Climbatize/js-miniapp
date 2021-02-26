import React, { useReducer } from 'react';
import { displayDate } from '../js_sdk';

import {
  Button,
  CircularProgress,
  FormGroup,
  Typography,
  CardContent,
  ListItemText,
} from '@material-ui/core';
import { red, green } from '@material-ui/core/colors';
import { makeStyles } from '@material-ui/core/styles';
import clsx from 'clsx';
import {
  CustomPermission,
  CustomPermissionResult,
  CustomPermissionName,
  CustomPermissionStatus,
  AccessTokenData,
} from 'js-miniapp-sdk';
import { connect } from 'react-redux';

import GreyCard from '../components/GreyCard';
import { requestCustomPermissions } from '../services/permissions/actions';
import { requestAccessToken } from '../services/user/actions';

const useStyles = makeStyles((theme) => ({
  wrapper: {
    position: 'relative',
    marginTop: 20,
  },
  buttonSuccess: {
    backgroundColor: green[500],
    '&:hover': {
      backgroundColor: green[700],
    },
  },
  buttonFailure: {
    backgroundColor: red[500],
    '&:hover': {
      backgroundColor: red[700],
    },
  },
  buttonProgress: {
    position: 'absolute',
    top: 'calc(50% - 10px)',
    left: 'calc(50% - 10px)',
  },
  error: {
    color: red[500],
    marginTop: 20,
  },
  success: {
    color: green[500],
    marginTop: 20,
    textAlign: 'center',
    wordBreak: 'break-all',
  },
  rootFormGroup: {
    alignItems: 'center',
  },
  red: {
    color: red[500],
  },
}));

const initialState = {
  isLoading: false,
  isError: false,
  hasRequestedPermissions: false,
};

const dataFetchReducer = (state, action) => {
  switch (action.type) {
    case 'FETCH_INIT':
      return {
        ...state,
        isLoading: true,
        isError: false,
        hasRequestedPermissions: false,
      };
    case 'FETCH_SUCCESS':
      return {
        ...state,
        isLoading: false,
        isError: false,
        hasRequestedPermissions: true,
      };
    case 'FETCH_FAILURE':
      return {
        ...state,
        isLoading: false,
        isError: true,
      };
    default:
      throw new Error();
  }
};

type AuthTokenProps = {
  permissions: CustomPermissionName[],
  accessToken: AccessTokenData,
  getAccessToken: () => Promise<string>,
  requestPermissions: (
    permissions: CustomPermission[]
  ) => Promise<CustomPermissionResult[]>,
};

function AuthToken(props: AuthTokenProps) {
  const [state, dispatch] = useReducer(dataFetchReducer, initialState);
  const classes = useStyles();

  const buttonClassname = clsx({
    [classes.buttonFailure]: state.isError,
    [classes.buttonSuccess]: !state.isError,
  });

  function requestAccessTokenPermission() {
    const permissionsList = [
      {
        name: CustomPermissionName.ACCESS_TOKEN,
        description:
          'We would like to get the Access token details to share with this Mini app',
      },
    ];

    props
      .requestPermissions(permissionsList)
      .then((permissions) =>
        permissions
          .filter(
            (permission) => permission.status === CustomPermissionStatus.ALLOWED
          )
          .map((permission) => permission.name)
      )
      .then((permissions) =>
        Promise.all([
          hasPermission(CustomPermissionName.ACCESS_TOKEN, permissions)
            ? props.getAccessToken()
            : null,
        ])
      )
      .then(() => dispatch({ type: 'FETCH_SUCCESS' }))
      .catch((e) => {
        console.error(e);
        dispatch({ type: 'FETCH_FAILURE' });
      });
  }

  function hasPermission(permission, permissionList: ?(string[])) {
    permissionList = permissionList || props.permissions || [];
    return permissionList.indexOf(permission) > -1;
  }

  function handleClick(e) {
    if (!state.isLoading) {
      e.preventDefault();
      dispatch({ type: 'FETCH_INIT' });
      requestAccessTokenPermission();
    }
  }

  function ButtonWrapper() {
    return (
      <div className={classes.wrapper}>
        <Button
          onClick={handleClick}
          variant="contained"
          color="primary"
          className={buttonClassname}
          disabled={state.isLoading}
          data-testid="authButton"
        >
          Authentication
        </Button>
        {state.isLoading && (
          <CircularProgress size={20} className={classes.buttonProgress} />
        )}
      </div>
    );
  }

  function AccessToken() {
    const hasDeniedPermission =
      state.hasRequestedPermissions &&
      !hasPermission(CustomPermissionName.ACCESS_TOKEN);

    return hasDeniedPermission ? (
      <ListItemText
        primary="Access Token permission is denied by the user."
        className={classes.red}
      />
    ) : null;
  }

  return (
    <GreyCard height="auto">
      <CardContent>
        <FormGroup column="true" classes={{ root: classes.rootFormGroup }}>
          {ButtonWrapper()}
          {props.accessToken && (
            <Typography variant="body1" className={classes.success}>
              Token: {props.accessToken.token}
            </Typography>
          )}
          {props.accessToken && (
            <Typography variant="body1" className={classes.success}>
              Valid until: {displayDate(props.accessToken.validUntil)}
            </Typography>
          )}
          <div>{AccessToken()}</div>
        </FormGroup>
      </CardContent>
    </GreyCard>
  );
}

const mapStateToProps = (state) => {
  return {
    permissions: state.permissions,
    accessToken: state.user.accessToken,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    getAccessToken: () => dispatch(requestAccessToken()),
    requestPermissions: (permissions) =>
      dispatch(requestCustomPermissions(permissions)),
  };
};

export { AuthToken };
export default connect(mapStateToProps, mapDispatchToProps)(AuthToken);
