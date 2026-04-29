import { z } from 'zod'

export const MintCertificateResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  courseId: z.string(),
  txHash: z.string().nullable(),
  certificateHash: z.string(),
  tokenId: z.string().nullable(),
  ipfsHash: z.string().nullable(),
  status: z.enum(['PENDING', 'MINTING', 'COMPLETED', 'FAILED']),
  issuedAt: z.date(),
})

export const MyCertificateItemSchema = z.object({
  id: z.string(),
  courseId: z.string(),
  txHash: z.string().nullable(),
  certificateHash: z.string(),
  status: z.enum(['PENDING', 'MINTING', 'COMPLETED', 'FAILED']),
  issuedAt: z.date(),
  course: z.object({
    id: z.string(),
    title: z.string(),
    slug: z.string(),
    thumbnail: z.string().nullable(),
  }),
})

export const MyCertificatesResponseSchema = z.array(MyCertificateItemSchema)
