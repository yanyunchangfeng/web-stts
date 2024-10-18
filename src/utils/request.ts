import axios from 'axios';
import { token, loginMsg } from 'src/shared';

axios.interceptors.request.use(async (config) => {
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`; // 在请求头中添加令牌
    config.headers['supToken'] = `Bearer ${token}`;
    config.headers['userName'] = `${loginMsg.user.userName}`;
    config.headers['userId'] = `${loginMsg.user.id}`;
    config.headers['X-Tenant-ID'] = `${loginMsg.tenantId}`;
  }
  return config;
});

axios.interceptors.response.use((res) => {
  const { code, data } = res.data;
  if (code === 200) {
    return data;
  }
  return Promise.reject(res.data);
});

export { axios };
