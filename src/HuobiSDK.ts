import axios from 'axios';
import { createHmac } from 'crypto';
import dayjs from 'dayjs';
import { parse } from 'url';
import type { AccountType, BalanceType } from './types.js';
import utc from 'dayjs/plugin/utc.js';
dayjs.extend(utc);

export class HuobiSDK {
  constructor(private url: string, private accessKey: string, private secretKey: string) {
    this.url = url;
    this.accessKey = accessKey;
    this.secretKey = secretKey;
  }

  private async sendPublicRequest(endpoint: string, data?: object) {
    const method = 'GET';
    const res = await axios(`${this.url}${endpoint}`, {
      method,
      params: {
        ...data,
        Signature: this.getSignature(method, endpoint, data),
      },
    });
    return res.data;
  }

  private async sendRequest(method: 'GET' | 'POST', endpoint: string, data?: object) {
    const defaultData = this.getBody();

    const res = await axios(`${this.url}${endpoint}`, {
      method,
      params: {
        ...defaultData,
        ...data,
        Signature: this.getSignature(method, endpoint, { ...defaultData, ...data }),
      },
    });

    return res.data.data;
  }

  private getBody(): {
    AccessKeyId: string;
    SignatureMethod: 'HmacSHA256';
    SignatureVersion: number;
    Timestamp: string;
  } {
    return {
      AccessKeyId: this.accessKey,
      SignatureMethod: 'HmacSHA256',
      SignatureVersion: 2,
      Timestamp: dayjs().utc().format('YYYY-MM-DDTHH:mm:ss'),
    };
  }

  private getSignature(method: string, endpoint: string, data: any) {
    const params: any[] = [];
    for (const item in data) {
      params.push(item + '=' + encodeURIComponent(data[item]));
    }

    const p = params.sort().join('&');

    const meta = [method, parse(this.url).host, endpoint, p].join('\n');
    return createHmac('SHA256', this.secretKey).update(meta).digest('base64');
  }

  async getStatus() {
    const { data } = await axios.get('https://status.huobigroup.com/api/v2/summary.json');
    return data;
  }

  /**
   * Get all Accounts of the Current User
   */
  async getAccounts(): Promise<{ id: number; type: AccountType; subtype: string; state: 'working' | 'lock' }> {
    return await this.sendRequest('GET', '/v1/account/accounts');
  }

  /**
   * Get Account Balance of a Specific Account
   * @param accountId
   */
  async getBalance(
    accountId: number,
  ): Promise<{ list: { currency: string; type: BalanceType; balance: string; 'seq-num': string }[] }> {
    return await this.sendRequest('GET', `/v1/account/accounts/${accountId}/balance`);
  }

  async getMarketDetail(symbol: string) {
    return await this.sendPublicRequest('/market/detail', { symbol });
  }

  async getSymbols() {
    return await this.sendRequest('GET', '/v2/settings/common/symbols');
  }
}
