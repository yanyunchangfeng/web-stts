import { safeJsonParse } from 'src/utils';
export const token = localStorage.getItem('ticket') || 'BikFGQBadzJrjFAgxMpqU';
const loginMsgStr =
  localStorage.getItem('loginMsg') ||
  `{"user":{"id":4589627226835904,"userName":"xuxiaodong","userType":0},"companies":[{"id":1000,"name":"默认公司","code":"default_org_company"}],"currentCompany":{"id":1000,"name":"默认公司","code":"default_org_company"},"status":"ok","ticket":"BikFGQBadzJrjFAgxMpqU","tenantId":"dt","username":"xuxiaodong","userId":4589627226835904,"userType":0,"accessToken":null,"expiresIn":null,"refreshToken":null,"clientId":null,"code":null,"redirectUri":null,"state":null,"clientAccessToken":null,"clientRefreshToken":null,"loginType":"0","userBind":null,"protocolType":null,"userAgent":null,"realIp":null,"needForceLogin":false,"kickoutMsg":null,"uniqueLogin":false,"expire":0,"companyCode":null,"staffCode":null}`;
export const loginMsg = safeJsonParse(loginMsgStr || '');
