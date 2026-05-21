const fs = require('fs');
const filePath = 'c:\\\\Users\\\\LE THANH CUONG\\\\OneDrive\\\\Desktop\\\\Lotte_Mart_Project\\\\fontend\\\\src\\\\admin\\\\pages\\\\AdminCouponsManagement.tsx';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  "import { toast } from 'react-toastify';",
  "import { toast } from 'react-toastify';\nimport { useTranslation } from 'react-i18next';"
);

content = content.replace(
  "const AdminCouponsManagement: React.FC = () => {",
  "const AdminCouponsManagement: React.FC = () => {\n  const { t } = useTranslation();"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed useTranslation');
