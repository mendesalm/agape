---
trigger: model_decision
description: Regras de negócio e UX para identificação de clientes, cadastro de Irmãos/Convidados e vínculo de Dependentes no E-Sigma ∴ Ágape.
---

# Regras de Identificação e Cadastro de Clientes — E-Sigma ∴ Ágape

- **Cabeçalho padrão:** `E-Sigma ∴ Ágape` (`COMANDASMART POS`) e loja ativa `Loja João Pedro Junqueira`.
- **Identificação (`1` / `1B`):**
  - Aceitar **QR Code / Cartão**, **CIM (5–7 dígitos)** e **CPF (11 dígitos)** sem travar máscara de CPF para CIMs curtos.
  - Oferecer atalhos **`Buscar por Nome`** e **`Últimos Atendidos`** junto ao numpad.
- **Confirmação (`1C`):**
  - Exibir foto ampliada do titular, vínculo (`Irmão`), CIM/CPF mascarado, cartão ativo e saldo disponível.
  - Exibir a lista de **Dependentes Autorizados** (`Esposa`, `Filho`, etc.) que podem retirar itens em nome do titular, com botão **`+ Cadastrar`** para adicionar subcliente já referenciado ao titular.
- **Cadastro Novo (`1D`):**
  - O cadastro avulso permite apenas **`Novo Irmão`** ou **`Convidado`** (não maçom / não dependente).
  - Dependentes (esposa/filhos) são cadastrados exclusivamente a partir da ficha do titular (`1C`).
  - **E-mail obrigatório** em todos os cadastros (titulares, convidados e dependentes), além de Nome Completo e WhatsApp/Telefone.
