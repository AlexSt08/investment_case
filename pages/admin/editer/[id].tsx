import { useRouter } from 'next/router'
import CaseEditor from '../../../components/CaseEditor'

export default function EditCase() {
  const router = useRouter()
  const { id } = router.query
  if (!id) return null
  return <CaseEditor caseId={id as string} />
}
