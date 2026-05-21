import User from '../models/User.js';

export const initSuperAdmin = async () => {
    try {
        const email = process.env.SUPERADMIN_EMAIL;
        const password = process.env.SUPERADMIN_PASSWORD;

        if (!email || !password) {
            console.log('⚠️ No se definieron SUPERADMIN_EMAIL o SUPERADMIN_PASSWORD en .env. Saltando creación de Superadmin.');
            return;
        }

        // Buscar si ya existe el usuario incluyendo el password para poder sobreescribirlo si es necesario
        const existingSuperAdmin = await User.findOne({ email }).select('+password');

        if (existingSuperAdmin) {
            let changed = false;
            if (existingSuperAdmin.role !== 'SUPERADMIN') {
                existingSuperAdmin.role = 'SUPERADMIN';
                changed = true;
            }
            
            // Forzamos la actualización de la contraseña por si se corrompió o cambió en el .env
            existingSuperAdmin.password = password;
            await existingSuperAdmin.save();
            
            if (changed) {
                console.log(`✅ Usuario ${email} actualizado al rol SUPERADMIN y contraseña restablecida.`);
            } else {
                console.log(`✅ Superadmin ${email} configurado y contraseña restablecida.`);
            }
        } else {
            // Si no existe, lo creamos
            const newSuperAdmin = await User.create({
                firstName: 'SaaS',
                lastName: 'Admin',
                email: email,
                password: password,
                role: 'SUPERADMIN',
                plan: 'CORPORATE',
                subscriptionStatus: 'ACTIVE'
            });
            console.log(`🚀 Superadmin creado exitosamente: ${newSuperAdmin.email}`);
        }
    } catch (error) {
        console.error('❌ Error al inicializar Superadmin:', error);
    }
};
