// utils/pdfGenerator.js
import PDFDocument from 'pdfkit'
import fs from 'fs'
import QRCode from 'qrcode'

/**
 * Génère un PDF pour une moto avec QR code
 * @param {object} motoData - informations de la moto et du propriétaire
 * @param {string} outputPath - chemin où le PDF sera enregistré
 */
export const generatePDF = async (motoData, outputPath) => {
  const doc = new PDFDocument({ margin: 50 })

  doc.pipe(fs.createWriteStream(outputPath))

  // Cadre autour de la page
  doc.rect(30, 20, 550, 750).stroke()

  // Titre
  doc.fontSize(20).text('Certificat d’Immatriculation', { align: 'center' })
  doc.moveDown(2)

  // Date et lieu
  doc.fontSize(12).text(`Lieu : ${motoData.lieu || 'N/A'}`, { align: 'right' })
  doc.text(`Date : ${new Date().toLocaleDateString()}`, { align: 'right' })
  doc.moveDown(2)

  // Infos Moto
  doc.fontSize(14).text('Informations Moto', { underline: true })
  doc.fontSize(12).text(`Numéro de chassis: ${motoData.numero_chassis}`)
  doc.text(`Numéro d’immatriculation: ${motoData.numero_immatriculation || 'N/A'}`)
  doc.text(`Marque: ${motoData.marque}`)
  doc.text(`Modèle: ${motoData.modele}`)
  doc.text(`Couleur: ${motoData.couleur}`)
  doc.text(`Année de fabrication: ${motoData.annee_fabrication}`)
  doc.moveDown()

  // Propriétaire
  doc.fontSize(14).text('Propriétaire', { underline: true })
  doc.fontSize(12).text(`Nom: ${motoData.proprietaire_nom}`)
  doc.text(`Adresse: ${motoData.proprietaire_adresse || 'N/A'}`)
  doc.text(`Téléphone: ${motoData.proprietaire_telephone || 'N/A'}`)
  doc.moveDown()

  // Structure
  doc.fontSize(14).text('Structure', { underline: true })
  doc.fontSize(12).text(`Nom: ${motoData.structure_nom || 'N/A'}`)
  doc.text(`Adresse: ${motoData.structure_adresse || 'N/A'}`)
  doc.moveDown(2)

  // Générer le QR code
  const qrData = `https://universearch.example.com/motos/${motoData.id}` // Remplace par ton URL ou ID
  const qrImageData = await QRCode.toDataURL(qrData)

  // Ajouter le QR code dans le PDF
  const qrImageBuffer = Buffer.from(qrImageData.split(',')[1], 'base64')
  doc.image(qrImageBuffer, 450, 650, { width: 100, height: 100 })

  // Note
  doc.fontSize(10).text('--- Ce document est généré automatiquement ---', { align: 'center' })

  doc.end()
}
