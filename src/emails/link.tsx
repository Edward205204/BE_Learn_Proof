import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components'
import * as React from 'react'

interface LinkEmailProps {
  link: string
  title: string
  heading: string
}

export const LinkEmail = ({ link, title, heading }: LinkEmailProps) => (
  <Html>
    <Head />
    <Preview>{title}</Preview>
    <Body style={main}>
      <Container style={container}>
        {/* Logo Section */}
        <Section style={logoContainer}>
          <Text style={logoText}>LEARN PROOF</Text>
        </Section>

        {/* Content Section */}
        <Heading style={h1}>{title}</Heading>
        <Text style={text}>{heading}</Text>

        <Section style={btnContainer}>
          <Button style={button} href={link}>
            Đặt lại mật khẩu ngay
          </Button>
        </Section>

        <Text style={text}>Hoặc copy và dán đường dẫn này vào trình duyệt của bạn:</Text>
        <Text style={linkText}>{link}</Text>

        <Hr style={hr} />

        {/* Footer */}
        <Text style={footer}>
          Nếu bạn không yêu cầu thay đổi này, hãy bỏ qua email này. Tài khoản của bạn vẫn an toàn.
        </Text>
        <Text style={footer}>© {new Date().getFullYear()} Learn Proof Team. Đà Nẵng, Việt Nam.</Text>
      </Container>
    </Body>
  </Html>
)

export default LinkEmail

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

const h1 = {
  color: '#1f2937',
  fontSize: '20px',
  fontWeight: '600',
  textAlign: 'center' as const,
  margin: '30px 0',
}

const text = {
  color: '#4b5563',
  fontSize: '15px',
  lineHeight: '24px',
  textAlign: 'center' as const,
}

const btnContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#0a85ea',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 24px',
}

const linkText = {
  fontSize: '13px',
  color: '#9ca3af',
  wordBreak: 'break-all' as const,
  textAlign: 'center' as const,
  marginTop: '8px',
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
