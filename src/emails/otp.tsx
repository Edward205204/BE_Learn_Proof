import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components'
import * as React from 'react'

interface OTPEmailProps {
  otpCode: string
  title: string
  heading: string
}

export const OTPEmail = ({ otpCode, title, heading }: OTPEmailProps) => (
  <Html>
    <Head />
    <Preview>{title}</Preview>
    <Body style={main}>
      <Container style={container}>
        {/* Logo Section */}
        <Section style={logoContainer}>
          <Text style={logoText}>LP</Text>
        </Section>

        {/* Content Section */}
        <Text style={tertiary}>MÃ XÁC THỰC OTP</Text>
        <Heading style={h1}>{heading}</Heading>

        <Section style={codeContainer}>
          <Text style={codeStyle}>{otpCode}</Text>
        </Section>

        <Text style={text}>
          Mã này sẽ hết hạn sau 5 phút. Để bảo mật, tuyệt đối không chia sẻ mã này với bất kỳ ai.
        </Text>

        <Hr style={hr} />

        {/* Security Note & Footer */}
        <Text style={footer}>
          Nếu bạn không chủ động yêu cầu mã này, vui lòng bỏ qua email hoặc liên hệ với bộ phận hỗ trợ của chúng tôi.
        </Text>
        <Text style={footer}>© {new Date().getFullYear()} Learn Proof Team. Đà Nẵng, Việt Nam.</Text>
      </Container>
    </Body>
  </Html>
)

OTPEmail.PreviewProps = {
  otpCode: '144833',
  title: 'Mã otp xác thực tài khoản Learn Proof',
  heading: 'Hãy nhập mã xác thực OTP sau vào trang đăng ký tài khoản',
} as OTPEmailProps

export default OTPEmail

// --- Styles ---
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '40px 20px',
  marginBottom: '64px',
  borderRadius: '8px',
  border: '1px solid #e6ebf1',
  maxWidth: '450px',
}

const logoContainer = {
  textAlign: 'center' as const,
  marginBottom: '32px',
}

const logoText = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#0a85ea',
  letterSpacing: '-0.5px',
  margin: '0',
}

const tertiary = {
  color: '#0a85ea',
  fontSize: '12px',
  fontWeight: '700',
  textAlign: 'center' as const,
  letterSpacing: '1px',
  margin: '0 0 10px 0',
}

const h1 = {
  color: '#1f2937',
  fontSize: '18px',
  fontWeight: '600',
  textAlign: 'center' as const,
  margin: '0 0 30px 0',
  lineHeight: '26px',
}

const codeContainer = {
  background: '#f4f7ff',
  borderRadius: '8px',
  margin: '24px auto',
  width: '100%',
  maxWidth: '280px',
  border: '1px dashed #adcfff',
  textAlign: 'center' as const,
}

const codeStyle = {
  color: '#0a85ea',
  fontSize: '36px',
  fontWeight: '700',
  letterSpacing: '8px',
  lineHeight: '48px',
  padding: '12px 0',
  margin: '0 auto',
}

const text = {
  color: '#4b5563',
  fontSize: '14px',
  lineHeight: '22px',
  textAlign: 'center' as const,
  padding: '0 20px',
}

const hr = {
  borderColor: '#e6ebf1',
  margin: '40px 0',
}

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '18px',
  textAlign: 'center' as const,
  marginTop: '12px',
}
