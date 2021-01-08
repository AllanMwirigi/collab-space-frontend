export const getBaseUrl = () => {
  let url;
  if(process.env.REACT_APP_ENV === 'development') {
    url = process.env.REACT_APP_DEV_API_URL;
  }
  if(process.env.REACT_APP_ENV === 'production') {
    url = process.env.REACT_APP_PROD_API_URL;
  }
  return url;
}

export const getPeerConfig = () => {
  let host, port;
  if(process.env.REACT_APP_ENV === 'development') {
    host = process.env.REACT_APP_DEV_PEER_HOST;
    port = process.env.REACT_APP_DEV_PEER_PORT;
  }
  if(process.env.REACT_APP_ENV === 'production') {
    host = process.env.REACT_APP_PROD_PEER_HOST;
    port = process.env.REACT_APP_PROD_PEER_PORT;
  }
  return { host, port };
}

export class MyConsole {
  log = (val1, val2, val3) => {
    if(process.env.REACT_APP_ENV === 'development') {
      console.log(val1, val2, val3);
    }
  }
}

export const getHumanReadableTime = (timestamp) => {
  const dateStr = new Date(timestamp).toString(); // "Fri Oct 16 2020 14:31:01 GMT+0300 (East Africa Time)"
  const parts = dateStr.split(' ');
  const month = parts[1];
  const day = parts[2];
  // const year = parts[3];
  const time = parts[4].substring(0,5);
  // const time = parts[4]; // need seconds because chart overwrites previous value of y-axis if x-axis is the same
  const timeString = `${day} ${month} ${time}`;
  return timeString;
}

export const getCurrentTime = () => {
  const dateStr = new Date().toString(); // "Fri Oct 16 2020 14:31:01 GMT+0300 (East Africa Time)"
  const parts = dateStr.split(' ');
  const dayofweek = parts[0];
  const month = parts[1];
  const day = parts[2];
  // const year = parts[3];
  const time = parts[4].substring(0,5);
  const timeString = `${dayofweek} ${day} ${month} ${time}`;
  return timeString;
}