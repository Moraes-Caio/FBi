import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export async function gerarPdfRelatorio(
  dadosRelatorio: any,
  resumoExecutivo: string,
  nomeRestaurante: string,
): Promise<Blob> {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()

  // Cabeçalho
  doc.setFontSize(20)
  doc.setTextColor(29, 78, 216) // #1D4ED8
  doc.text(nomeRestaurante || 'Restaurante', 14, 22)

  doc.setFontSize(14)
  doc.setTextColor(0, 0, 0)
  doc.text(`Relatório de Feedback - ${dadosRelatorio.periodo}`, 14, 30)
  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text(`Gerado em: ${new Date(dadosRelatorio.geradoEm).toLocaleDateString('pt-BR')}`, 14, 36)

  let yPos = 45

  // Resumo Executivo
  doc.setFontSize(14)
  doc.setTextColor(29, 78, 216)
  doc.text('Resumo Executivo', 14, yPos)
  yPos += 8

  doc.setFontSize(11)
  doc.setTextColor(50, 50, 50)
  const resumoLines = doc.splitTextToSize(
    resumoExecutivo || 'Nenhum resumo gerado.',
    pageWidth - 28,
  )
  doc.text(resumoLines, 14, yPos)
  yPos += resumoLines.length * 6 + 10

  // KPIs
  doc.setFontSize(14)
  doc.setTextColor(29, 78, 216)
  doc.text('KPIs Principais', 14, yPos)
  yPos += 8

  doc.setFontSize(11)
  doc.setTextColor(0, 0, 0)
  const kpis = dadosRelatorio.kpis || {}
  const temaCritico =
    kpis.criticalTheme && kpis.criticalTheme !== 'Nenhum'
      ? `${kpis.criticalTheme} (${kpis.criticalPercent || 0}% negativas)`
      : 'Nenhum'
  doc.text(`Total de avaliações: ${kpis.totalFeedbacks || 0}`, 14, yPos)
  doc.text(`Índice de satisfação: ${kpis.sentiment || 0}/100`, 90, yPos)
  yPos += 7
  doc.text(`Positivas: ${kpis.positivos || 0} (${kpis.positivePercent || 0}%)`, 14, yPos)
  doc.text(`Negativas: ${kpis.negativos || 0} (${kpis.negativePercent || 0}%)`, 90, yPos)
  yPos += 7
  doc.text(`Tema que mais preocupa: ${temaCritico}`, 14, yPos)
  yPos += 12

  // Destaques do período (recortes acionáveis)
  const est = dadosRelatorio.estatisticas
  if (est) {
    doc.setFontSize(14)
    doc.setTextColor(29, 78, 216)
    doc.text('Destaques do período', 14, yPos)
    yPos += 8

    doc.setFontSize(11)
    doc.setTextColor(0, 0, 0)
    const destaques = [
      `Clientes únicos: ${est.clientesUnicos} (${est.avaliacoesPorCliente} avaliação/cliente)`,
      `Clientes que voltaram a avaliar: ${est.clientesRecorrentes}`,
      est.melhorCategoria ? `Melhor categoria: ${est.melhorCategoria.nome} (${est.melhorCategoria.satisfacao}/100)` : '',
      est.piorCategoria ? `Categoria mais fraca: ${est.piorCategoria.nome} (${est.piorCategoria.satisfacao}/100)` : '',
      est.melhorDia ? `Melhor dia: ${est.melhorDia.nome} (${est.melhorDia.satisfacao}/100)` : '',
      est.piorDia ? `Dia mais fraco: ${est.piorDia.nome} (${est.piorDia.satisfacao}/100)` : '',
      est.faixaMaisMovimentada ? `Horário mais movimentado: ${est.faixaMaisMovimentada.nome} (${est.faixaMaisMovimentada.total} avaliações)` : '',
      est.faixaCritica ? `Horário mais fraco: ${est.faixaCritica.nome} (${est.faixaCritica.satisfacao}/100)` : '',
    ].filter(Boolean)

    for (const linha of destaques) {
      if (yPos > 270) { doc.addPage(); yPos = 20 }
      doc.text(`• ${linha}`, 14, yPos)
      yPos += 6
    }
    yPos += 9
  }

  // Categorias
  doc.setFontSize(14)
  doc.setTextColor(29, 78, 216)
  doc.text('Satisfação por categoria', 14, yPos)
  yPos += 5

  const categorias = dadosRelatorio.categorias || []
  if (categorias.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [['Categoria', 'Avaliações', 'Satisfação (0-100)']],
      body: categorias.map((c: any) => [
        c.nome || c.name || c.categoria || '-',
        String(c.total ?? c.count ?? '-'),
        String(c.satisfacao ?? c.score ?? '-'),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [29, 78, 216] },
      margin: { left: 14, right: 14 },
    })
    yPos = (doc as any).lastAutoTable.finalY + 15
  } else {
    doc.setFontSize(11)
    doc.setTextColor(100, 100, 100)
    doc.text('Sem dados de categoria no período.', 14, yPos)
    yPos += 15
  }

  // Principais Insights
  if (yPos > 250) {
    doc.addPage()
    yPos = 20
  }
  doc.setFontSize(14)
  doc.setTextColor(29, 78, 216)
  doc.text('Principais Insights', 14, yPos)
  yPos += 8

  doc.setFontSize(11)
  doc.setTextColor(50, 50, 50)
  const insights = dadosRelatorio.insights || []
  if (insights.length > 0) {
    insights.forEach((insight: any, index: number) => {
      if (yPos > 270) {
        doc.addPage()
        yPos = 20
      }
      doc.text(`${index + 1}. ${insight.titulo} [${insight.prioridade}]`, 14, yPos)
      yPos += 6
    })
  } else {
    doc.text('Nenhum insight ativo.', 14, yPos)
    yPos += 6
  }
  yPos += 10

  // Feedbacks Relevantes
  if (yPos > 240) {
    doc.addPage()
    yPos = 20
  }
  doc.setFontSize(14)
  doc.setTextColor(29, 78, 216)
  doc.text('Feedbacks Relevantes', 14, yPos)
  yPos += 8

  doc.setFontSize(10)
  const feedbacks = dadosRelatorio.feedbacks || []
  if (feedbacks.length > 0) {
    feedbacks.forEach((f: any) => {
      if (yPos > 270) {
        doc.addPage()
        yPos = 20
      }
      const sent = String(f.sentimento).toLowerCase()
      doc.setTextColor(
        sent === 'positivo' ? 34 : sent === 'negativo' ? 239 : 100,
        sent === 'positivo' ? 197 : sent === 'negativo' ? 68 : 100,
        sent === 'positivo' ? 94 : sent === 'negativo' ? 68 : 100,
      )
      doc.text(`[${f.categoria || 'Geral'}]`, 14, yPos)

      doc.setTextColor(80, 80, 80)
      doc.setFont('helvetica', 'italic')
      const textLines = doc.splitTextToSize(
        `"${f.texto_original || f.resumo || '-'}"`,
        pageWidth - 28,
      )
      doc.text(textLines, 14, yPos + 5)
      doc.setFont('helvetica', 'normal')
      yPos += textLines.length * 5 + 10
    })
  } else {
    doc.setTextColor(100, 100, 100)
    doc.text('Nenhum feedback no período.', 14, yPos)
  }

  // Rodapé em todas as páginas
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text('Gerado por Feedback Inteligente', pageWidth / 2, 290, { align: 'center' })
  }

  return doc.output('blob')
}
