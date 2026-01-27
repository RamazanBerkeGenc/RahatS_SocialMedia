import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://10.0.2.2:3000/api',
  timeout: 10000,
});

export default apiClient;