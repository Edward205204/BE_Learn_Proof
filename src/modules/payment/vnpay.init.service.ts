import { Injectable } from '@nestjs/common'
import envConfig from '../../shared/config'
import { VNPay, ignoreLogger, HashAlgorithm } from 'vnpay'

@Injectable()
export class VnpayInitService {
  vnpay: VNPay
  constructor() {
    this.vnpay = new VNPay({
      tmnCode: envConfig.VNP_TMN_CODE,
      secureSecret: envConfig.VNP_HASH_SECRET,
      vnpayHost: 'https://sandbox.vnpayment.vn',

      testMode: true,
      hashAlgorithm: 'SHA512' as HashAlgorithm,
      enableLog: true,
      loggerFn: ignoreLogger,

      endpoints: {
        paymentEndpoint: 'paymentv2/vpcpay.html',
        queryDrRefundEndpoint: 'merchant_webapi/api/transaction',
        getBankListEndpoint: 'qrpayauth/api/merchant/get_bank_list',
      },
    })
  }

  createPayment(data: { amount: number; txnRef: string }) {
    const paymentUrl = this.vnpay.buildPaymentUrl({
      vnp_Amount: data.amount,
      vnp_IpAddr: '192.168.1.1',
      vnp_ReturnUrl: envConfig.RETURN_URL,
      vnp_TxnRef: data.txnRef, //id đơn hàng
      vnp_OrderInfo: `Thanh toán đơn hàng ${data.txnRef}`,
    })
    return paymentUrl
  }

  verifyReturnQuery(query: Record<string, unknown>): { isSuccess: boolean; isVerified: boolean; message: string } {
    const result = this.vnpay.verifyReturnUrl(query as never)
    return {
      isSuccess: result.isSuccess,
      isVerified: result.isVerified,
      message: result.message,
    }
  }
}
