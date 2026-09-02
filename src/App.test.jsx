/* @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import App from './App.jsx'

beforeEach(() => {
  cleanup()
  localStorage.clear()
  sessionStorage.clear()
})

describe('Gestión de cumplimiento', () => {
  it('permite ingresar como TIBOX y muestra avance global y por ámbito', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /TIBOX · Editor/i }))

    expect(screen.getByRole('heading', { name: 'Empresas' })).toBeTruthy()
    const companyName = screen.getAllByText('TIBOX').find((element) => element.closest('button'))
    fireEvent.click(companyName.closest('button'))

    expect(screen.getByText('Avance global de la empresa')).toBeTruthy()
    expect(screen.getAllByText('Gobierno y gestión del cumplimiento').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Privacidad, consentimiento y derechos').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Capacitación y seguimiento continuo').length).toBeGreaterThan(0)
  })

  it('limita el acceso del cliente a su empresa asociada', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /Cliente · Editor/i }))

    expect(screen.getByRole('heading', { name: 'Froens SpA' })).toBeTruthy()
    expect(screen.queryByText('Quintero Energía')).toBeNull()
    expect(screen.queryByText('QC Terminales Chile')).toBeNull()
  })
})
