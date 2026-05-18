import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Heading from '@tiptap/extension-heading'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import Highlight from '@tiptap/extension-highlight'
import TextStyle from '@tiptap/extension-text-style'
import Link from '@tiptap/extension-link'

interface Props {
  content?: object
  onChange: (json: object) => void
}

const ToolbarBtn = ({ onClick, active, title, children }: {
  onClick: () => void
  active?: boolean
  title?: string
  children: React.ReactNode
}) => (
  <button
    type="button"
    onMouseDown={(e) => { e.preventDefault(); onClick() }}
    className={active ? 'is-active' : ''}
    title={title}
    style={{ minWidth: 30 }}
  >
    {children}
  </button>
)

export default function RichEditor({ content, onChange }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false }),
      Heading.configure({ levels: [1, 2, 3] }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Highlight,
      TextStyle,
      Link.configure({ openOnClick: false }),
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON())
    },
    editorProps: {
      attributes: {
        class: 'tiptap-editor prose',
        'data-placeholder': 'Commencez à rédiger votre analyse ici…',
      },
    },
  })

  if (!editor) return null

  const addLink = () => {
    const url = prompt('URL :')
    if (url) editor.chain().focus().setLink({ href: url }).run()
  }

  const insertTable = () => {
    editor.chain().focus().insertTable({ rows: 4, cols: 3, withHeaderRow: true }).run()
  }

  return (
    <div>
      <div className="admin-toolbar">
        {/* History */}
        <ToolbarBtn onClick={() => editor.chain().focus().undo().run()} title="Annuler">↩</ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().redo().run()} title="Rétablir">↪</ToolbarBtn>

        <span style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 4px' }} />

        {/* Headings */}
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Titre 1">H1</ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Titre 2">H2</ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Titre 3">H3</ToolbarBtn>

        <span style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 4px' }} />

        {/* Marks */}
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Gras"><strong>B</strong></ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italique"><em>I</em></ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')} title="Surligner">◈</ToolbarBtn>
        <ToolbarBtn onClick={addLink} active={editor.isActive('link')} title="Lien">🔗</ToolbarBtn>

        <span style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 4px' }} />

        {/* Lists */}
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Liste">• List</ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Liste numérotée">1. List</ToolbarBtn>

        <span style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 4px' }} />

        {/* Blocks */}
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Citation">❝</ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Séparateur">—</ToolbarBtn>
        <ToolbarBtn onClick={insertTable} title="Insérer tableau">⊞ Table</ToolbarBtn>

        {/* Table controls — visible only when in a table */}
        {editor.isActive('table') && (
          <>
            <span style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 4px' }} />
            <ToolbarBtn onClick={() => editor.chain().focus().addColumnAfter().run()} title="Ajouter colonne">+Col</ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().addRowAfter().run()} title="Ajouter ligne">+Row</ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().deleteColumn().run()} title="Suppr colonne">-Col</ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().deleteRow().run()} title="Suppr ligne">-Row</ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().deleteTable().run()} title="Suppr tableau">✕ Table</ToolbarBtn>
          </>
        )}
      </div>

      <EditorContent editor={editor} />
    </div>
  )
}
