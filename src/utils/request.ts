import axios from "axios";

axios.interceptors.request.use(async (req) => {
  return req;
});

axios.interceptors.response.use((res) => {
  const { code, data } = res.data;
  if (code === 200) {
    return data;
  }
  return Promise.reject(res.data);
});

export { axios };
