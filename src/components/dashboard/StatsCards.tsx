interface Props {
  totalProvas: number
  provasAbertas: number
  totalParticipantes: number
}

export function StatsCards({ totalProvas, provasAbertas, totalParticipantes }: Props) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="card py-4 text-center">
        <p className="text-3xl font-bold text-amber-400">{totalParticipantes}</p>
        <p className="text-zinc-400 text-sm mt-1">Participantes</p>
      </div>
      <div className="card py-4 text-center">
        <p className="text-3xl font-bold text-zinc-100">{totalProvas}</p>
        <p className="text-zinc-400 text-sm mt-1">Provas</p>
      </div>
      <div className="card py-4 text-center">
        <p className="text-3xl font-bold text-green-400">{provasAbertas}</p>
        <p className="text-zinc-400 text-sm mt-1">Abertas</p>
      </div>
    </div>
  )
}
