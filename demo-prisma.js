// Demonstracao do Database First: usando o codigo que o Prisma GEROU
// a partir do banco do ReservaFlex. Rodar com: node demo-prisma.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n=== 1) READ: quantos registros tem em cada tabela ===');
  console.log('Organizacoes:', await prisma.organizacao.count());
  console.log('Usuarios:    ', await prisma.usuario.count());
  console.log('Recursos:    ', await prisma.recurso.count());
  console.log('Reservas:    ', await prisma.reserva.count());

  console.log('\n=== 2) READ com relacionamento (JOIN feito pelo Prisma) ===');
  const reservas = await prisma.reserva.findMany({
    take: 3,
    include: { usuario: true, recurso: true },
  });
  for (const r of reservas) {
    console.log(`${r.codigo_reserva} | ${r.usuario.nome} reservou "${r.recurso.nome}" em ${r.data_reserva}`);
  }

  console.log('\n=== 3) CREATE / UPDATE / DELETE num equipamento de teste ===');
  const org = await prisma.organizacao.findFirst();
  const novo = await prisma.equipamento.create({
    data: { organizacao_id: org.id_organizacao, nome: 'Projetor DEMO Prisma', categoria: 'Audiovisual' },
  });
  console.log('Criado:     ', novo.id_equipamento, novo.nome);

  const editado = await prisma.equipamento.update({
    where: { id_equipamento: novo.id_equipamento },
    data: { status: 'Inativo' },
  });
  console.log('Atualizado: ', editado.id_equipamento, 'status =', editado.status);

  await prisma.equipamento.delete({ where: { id_equipamento: novo.id_equipamento } });
  console.log('Excluido:   ', novo.id_equipamento, '(o banco volta como estava)');
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
