'use client'

import { createContext, useContext, useState, useCallback } from 'react'

type HeaderContextType = {
  acaoVoltar: (() => void) | null
  definirAcaoVoltar: (fn: (() => void) | null) => void
}

const HeaderContext = createContext<HeaderContextType>({
  acaoVoltar: null,
  definirAcaoVoltar: () => {},
})

export function HeaderProvider({ children }: { children: React.ReactNode }) {
  const [acaoVoltar, setAcaoVoltar] = useState<(() => void) | null>(null)

  const definirAcaoVoltar = useCallback((fn: (() => void) | null) => {
    setAcaoVoltar(fn !== null ? () => fn : null)
  }, [])

  return (
    <HeaderContext.Provider value={{ acaoVoltar, definirAcaoVoltar }}>
      {children}
    </HeaderContext.Provider>
  )
}

export function useHeader() {
  return useContext(HeaderContext)
}
